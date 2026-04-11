import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * Interceptor fonctionnel (Angular 15+)
 * - Ajoute le token JWT Bearer à chaque requête API
 * - Sur 401, déconnecte l'utilisateur automatiquement
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getToken();

    // Ne pas ajouter le token pour les requêtes d'auth (login/register)
    const isAuthRequest = req.url.includes('/api/auth/');

    let authReq = req;
    if (token && !isAuthRequest) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !isAuthRequest) {
                // Token expiré ou invalide → déconnexion
                authService.logout();
            }
            return throwError(() => error);
        })
    );
};
