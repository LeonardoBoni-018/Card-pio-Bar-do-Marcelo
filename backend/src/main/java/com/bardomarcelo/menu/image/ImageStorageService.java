package com.bardomarcelo.menu.image;

import com.bardomarcelo.menu.common.InvalidImageException;
import com.bardomarcelo.menu.config.AppProperties;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/**
 * Guarda as fotos dos itens em disco. Cada upload é validado pelo conteúdo (não pelo nome/Content-Type),
 * reduzido ao tamanho máximo e regravado com nome aleatório, o que remove metadados e payloads embutidos.
 */
@Service
public class ImageStorageService {

    private static final Logger log = LoggerFactory.getLogger(ImageStorageService.class);
    public static final Pattern FILENAME = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png)$");
    private static final long MAX_PIXELS = 40_000_000L;
    private static final float JPEG_QUALITY = 0.85f;

    private final Path root;
    private final int maxDimension;

    public ImageStorageService(AppProperties props) {
        this.root = Path.of(props.storage().dir()).toAbsolutePath().normalize();
        this.maxDimension = props.storage().maxDimension();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível criar o diretório de imagens: " + root, e);
        }
    }

    /** Valida, otimiza e grava a imagem; devolve o nome de arquivo gerado. */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Nenhum arquivo enviado.");
        }
        try (InputStream in = file.getInputStream(); ImageInputStream iis = ImageIO.createImageInputStream(in)) {
            BufferedImage image = readSafely(iis);
            BufferedImage resized = shrink(image);
            boolean hasAlpha = resized.getColorModel().hasAlpha();
            String filename = UUID.randomUUID() + (hasAlpha ? ".png" : ".jpg");
            Path target = root.resolve(filename);
            if (hasAlpha) {
                ImageIO.write(resized, "png", target.toFile());
            } else {
                writeJpeg(resized, target);
            }
            return filename;
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gravar a imagem", e);
        }
    }

    public boolean exists(String filename) {
        return resolve(filename) != null && Files.isRegularFile(resolve(filename));
    }

    /** Caminho do arquivo, ou {@code null} se o nome for inválido (protege contra path traversal). */
    public Path resolve(String filename) {
        if (filename == null || !FILENAME.matcher(filename).matches()) {
            return null;
        }
        Path path = root.resolve(filename).normalize();
        return path.startsWith(root) ? path : null;
    }

    public void delete(String filename) {
        Path path = resolve(filename);
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Não foi possível apagar a imagem {}", filename, e);
        }
    }

    /** Apaga o arquivo só depois do commit da transação atual (ou na hora, se não houver transação). */
    public void deleteAfterCommit(String filename) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    delete(filename);
                }
            });
        } else {
            delete(filename);
        }
    }

    private BufferedImage readSafely(ImageInputStream iis) throws IOException {
        Iterator<ImageReader> readers = iis == null ? null : ImageIO.getImageReaders(iis);
        if (readers == null || !readers.hasNext()) {
            throw new InvalidImageException("Arquivo não é uma imagem válida. Use JPG ou PNG.");
        }
        ImageReader reader = readers.next();
        try {
            String format = reader.getFormatName().toLowerCase();
            if (!format.equals("jpeg") && !format.equals("png")) {
                throw new InvalidImageException("Formato não suportado. Use JPG ou PNG.");
            }
            reader.setInput(iis, true, true);
            long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
            if (pixels > MAX_PIXELS) {
                throw new InvalidImageException("Imagem com resolução grande demais.");
            }
            return reader.read(0);
        } catch (IOException | RuntimeException e) {
            if (e instanceof InvalidImageException invalid) {
                throw invalid;
            }
            throw new InvalidImageException("Arquivo de imagem corrompido.");
        } finally {
            reader.dispose();
        }
    }

    private BufferedImage shrink(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        boolean alpha = src.getColorModel().hasAlpha();
        double scale = Math.min(1.0, (double) maxDimension / Math.max(w, h));
        int nw = Math.max(1, (int) Math.round(w * scale));
        int nh = Math.max(1, (int) Math.round(h * scale));
        if (scale == 1.0 && alpha == src.getColorModel().hasAlpha() && src.getType() != BufferedImage.TYPE_CUSTOM
                && (alpha || src.getType() == BufferedImage.TYPE_3BYTE_BGR)) {
            return src;
        }
        BufferedImage out = new BufferedImage(nw, nh, alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            if (!alpha) {
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, nw, nh);
            }
            g.drawImage(src, 0, 0, nw, nh, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    private void writeJpeg(BufferedImage image, Path target) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ImageOutputStream out = ImageIO.createImageOutputStream(target.toFile())) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.setOutput(out);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }
}
