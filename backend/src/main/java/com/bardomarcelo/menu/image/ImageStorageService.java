package com.bardomarcelo.menu.image;

import com.bardomarcelo.menu.common.InvalidImageException;
import com.bardomarcelo.menu.config.AppProperties;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.Iterator;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/**
 * Guarda as fotos dos itens no banco (o disco do Render é efêmero). Cada upload é validado pelo conteúdo
 * (não pelo nome/Content-Type), reduzido ao tamanho máximo e regravado com nome aleatório, o que remove
 * metadados e payloads embutidos. Fotos grandes são lidas com subamostragem para não estourar a memória
 * de instâncias pequenas (512 MB).
 */
@Service
public class ImageStorageService {

    public static final Pattern FILENAME = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png)$");
    private static final long MAX_PIXELS = 100_000_000L;
    private static final float JPEG_QUALITY = 0.85f;

    private final StoredImageRepository repository;
    private final TransactionTemplate newTransaction;
    private final int maxDimension;

    public ImageStorageService(StoredImageRepository repository, AppProperties props,
                               PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.maxDimension = props.storage().maxDimension();
    }

    public static boolean isValidName(String filename) {
        return filename != null && FILENAME.matcher(filename).matches();
    }

    /** Valida, otimiza e grava a imagem; devolve o nome de arquivo gerado. */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Nenhum arquivo enviado.");
        }
        try (InputStream in = file.getInputStream(); ImageInputStream iis = ImageIO.createImageInputStream(in)) {
            BufferedImage image = shrink(readSafely(iis));
            boolean png = image.getColorModel().hasAlpha();
            String filename = UUID.randomUUID() + (png ? ".png" : ".jpg");
            byte[] data = png ? encodePng(image) : encodeJpeg(image);
            repository.save(new StoredImage(filename, png ? "image/png" : "image/jpeg", data, Instant.now()));
            return filename;
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao processar a imagem", e);
        }
    }

    public Optional<StoredImage> find(String filename) {
        return isValidName(filename) ? repository.findById(filename) : Optional.empty();
    }

    public boolean exists(String filename) {
        return isValidName(filename) && repository.existsById(filename);
    }

    public void delete(String filename) {
        if (isValidName(filename)) {
            // transação própria: dentro de afterCommit() a transação original já terminou e não gravaria nada
            newTransaction.executeWithoutResult(status -> repository.deleteById(filename));
        }
    }

    /** Apaga só depois do commit da transação atual (ou na hora, se não houver transação). */
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
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if ((long) width * height > MAX_PIXELS) {
                throw new InvalidImageException("Imagem com resolução grande demais.");
            }
            ImageReadParam param = reader.getDefaultReadParam();
            int step = Math.max(1, Math.max(width, height) / maxDimension);
            if (step > 1) {
                param.setSourceSubsampling(step, step, 0, 0); // lê já reduzida: pouca memória
            }
            return reader.read(0, param);
        } catch (InvalidImageException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
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
        int type = src.getType();
        boolean standardType = type == BufferedImage.TYPE_INT_RGB || type == BufferedImage.TYPE_3BYTE_BGR
                || type == BufferedImage.TYPE_INT_ARGB;
        if (scale == 1.0 && standardType) {
            return src;
        }
        int nw = Math.max(1, (int) Math.round(w * scale));
        int nh = Math.max(1, (int) Math.round(h * scale));
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

    private static byte[] encodePng(BufferedImage image) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private static byte[] encodeJpeg(BufferedImage image) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ImageOutputStream out = ImageIO.createImageOutputStream(bytes)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.setOutput(out);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }
}
