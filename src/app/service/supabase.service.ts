import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase!: SupabaseClient;
    private isBrowser: boolean;

    private currentUserSubject = new BehaviorSubject<User | null>(null);
    currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

    private sessionSubject = new BehaviorSubject<Session | null>(null);
    session$: Observable<Session | null> = this.sessionSubject.asObservable();

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        this.isBrowser = isPlatformBrowser(this.platformId);
        if (this.isBrowser) {
            this.supabase = createClient(
                environment.supabase.url,
                environment.supabase.anonKey
            );
            this.initSession();
        }
    }

    private async initSession(): Promise<void> {
        const { data } = await this.supabase.auth.getSession();
        this.sessionSubject.next(data.session);
        this.currentUserSubject.next(data.session?.user ?? null);

        this.supabase.auth.onAuthStateChange((_event, session) => {
            this.sessionSubject.next(session);
            this.currentUserSubject.next(session?.user ?? null);
        });
    }

    get client(): SupabaseClient {
        return this.supabase;
    }

    async signUp(email: string, password: string, userData: {
        display_name: string;
        phone_number: string;
        initial_tokens: number;
    }) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: userData.display_name,
                    phone_number: userData.phone_number
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            // Insert into users table
            const { error: profileError } = await this.supabase.from('users').insert({
                id: data.user.id,
                email,
                phone_number: userData.phone_number,
                display_name: userData.display_name,
                initial_tokens: userData.initial_tokens,
                token_balance: userData.initial_tokens
            });
            if (profileError) throw profileError;
        }

        return data;
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    async getCurrentUser(): Promise<User | null> {
        const { data } = await this.supabase.auth.getUser();
        return data.user;
    }

    async getUserProfile(userId: string) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    }
}
