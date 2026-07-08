package com.mygutachter.security;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import org.bson.Document;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.mygutachter.model.ApiKey;
import com.mygutachter.service.ApiKeyService;
import com.mygutachter.service.UserAccountService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authenticates requests carrying an {@code X-API-KEY} header (used by OMT to push orders to
 * {@code POST /api/orders/import} — Decision Q5). Deferred from T2.2; added here in T3.1 because
 * the import endpoint is the first consumer.
 *
 * <p>On a valid, active key it resolves the key's owner and sets the SAME contract as
 * {@link JwtAuthenticationFilter}: the {@code userEmail}/{@code expertName}/{@code userRole}
 * request attributes plus a {@code ROLE_<role>} {@link SecurityContextHolder} authentication, so
 * the chain's {@code .authenticated()} rules pass. Like the JWT filter it never rejects — an
 * absent/invalid key simply leaves the request unauthenticated for the authorization layer.
 */
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-API-KEY";

    private final ApiKeyService apiKeyService;
    private final UserAccountService userAccountService;

    public ApiKeyAuthenticationFilter(ApiKeyService apiKeyService, UserAccountService userAccountService) {
        this.apiKeyService = apiKeyService;
        this.userAccountService = userAccountService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String apiKeyHeader = request.getHeader(API_KEY_HEADER);
        if (apiKeyHeader != null && !apiKeyHeader.isBlank()
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            Optional<ApiKey> apiKeyOpt = apiKeyService.findByKey(apiKeyHeader);
            if (apiKeyOpt.isPresent() && apiKeyOpt.get().isActive()) {
                ApiKey apiKey = apiKeyOpt.get();
                Document user = userAccountService.findByEmail(apiKey.getUserEmail());
                if (user != null) {
                    String email = user.getString("email");
                    if (email == null) {
                        email = apiKey.getUserEmail();
                    }
                    String username = user.getString("username");
                    String role = user.getString("role");
                    if (role == null) {
                        role = "EXPERT";
                    }

                    // Same request-attribute contract the controllers read.
                    request.setAttribute("userEmail", email);
                    request.setAttribute("expertName", username);
                    request.setAttribute("userRole", role);

                    var authority = new SimpleGrantedAuthority("ROLE_" + role);
                    var authentication = new UsernamePasswordAuthenticationToken(
                            email, null, List.of(authority));
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    apiKeyService.updateLastUsed(apiKey);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
