import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard: vérifie que l'utilisateur est authentifié
 * Redirige vers /auth/login sinon
 */
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) {
        return true;
    }

    // Stocker l'URL demandée pour rediriger après login
    router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
    });
    return false;
};

/**
 * Guard: vérifie que l'utilisateur a le rôle requis
 * Le rôle attendu est défini dans route.data['roles']
 * Redirige vers /auth/access si le rôle ne correspond pas
 */
export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
        router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
        });
        return false;
    }

    const requiredRoles = route.data?.['roles'] as string[];
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    if (authService.hasAnyRole(requiredRoles)) {
        return true;
    }

    // L'utilisateur n'a pas le bon rôle → page Access Denied
    router.navigate(['/auth/access']);
    return false;
};
