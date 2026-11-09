package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.auth.AppUserRepository;
import com.bardomarcelo.menu.auth.UserRole;
import com.bardomarcelo.menu.common.ConflictException;
import com.bardomarcelo.menu.common.NotFoundException;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Cadastro de garçons pelo proprietário. Garçom não é excluído (o histórico guarda quem lançou): é desativado. */
@Service
@ComandasEnabled
public class WaiterService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    public WaiterService(AppUserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public List<WaiterResponse> list() {
        return users.findAllByRoleOrderByDisplayNameAsc(UserRole.GARCOM).stream().map(WaiterResponse::from).toList();
    }

    @Transactional
    public WaiterResponse create(WaiterRequest request) {
        if (request.password() == null || request.password().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a senha do garçom.");
        }
        String username = username(request);
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new ConflictException("Esse usuário já está em uso.");
        }
        AppUser waiter = AppUser.waiter(username, encoder.encode(request.password()), request.name().trim());
        if (Boolean.FALSE.equals(request.active())) {
            waiter.updateProfile(username, waiter.getDisplayName(), false);
        }
        return WaiterResponse.from(users.save(waiter));
    }

    @Transactional
    public WaiterResponse update(Long id, WaiterRequest request) {
        AppUser waiter = find(id);
        String username = username(request);
        if (users.existsByUsernameIgnoreCaseAndIdNot(username, id)) {
            throw new ConflictException("Esse usuário já está em uso.");
        }
        waiter.updateProfile(username, request.name().trim(), request.active() == null ? waiter.isActive() : request.active());
        if (request.password() != null && !request.password().isEmpty()) {
            waiter.setPasswordHash(encoder.encode(request.password()));
        }
        return WaiterResponse.from(waiter);
    }

    private AppUser find(Long id) {
        return users.findById(id)
                .filter(u -> u.getRole() == UserRole.GARCOM)
                .orElseThrow(() -> new NotFoundException("Garçom não encontrado."));
    }

    /** Usuário sempre em minúsculas: o garçom não precisa lembrar de maiúsculas no celular. */
    private static String username(WaiterRequest request) {
        return request.username().trim().toLowerCase(Locale.ROOT);
    }
}
