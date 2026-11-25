import axios, { type AxiosInstance } from 'axios';
import { env } from '../../../config/env.js';

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class DarajaService {
  private readonly http: AxiosInstance;
  private tokenCache: TokenCache | null = null;
  private readonly baseUrl: string;
  private readonly oauthUrl: string;
  private readonly stkPushUrl: string;

  constructor() {
    const isProduction = env.MPESA_ENVIRONMENT === 'production';
    this.baseUrl = isProduction
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this.oauthUrl = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    this.stkPushUrl = `${this.baseUrl}/mpesa/stkpush/v1/processrequest`;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private getAuthHeader(): string {
    const credentials = `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.tokenCache && this.tokenCache.expiresAt > now) {
      return this.tokenCache.token;
    }

    const response = await this.http.get(this.oauthUrl, {
      headers: { Authorization: this.getAuthHeader() },
    });

    const accessToken = response.data.access_token as string;
    const expiresIn = (response.data.expires_in as number) || 3600;

    this.tokenCache = {
      token: accessToken,
      expiresAt: now + (expiresIn - 300) * 1000,
    };

    return accessToken;
  }

  generatePassword(shortcode: string, passkey: string): { password: string; timestamp: string } {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  async initiateStkPush(
    phoneNumber: string,
    amount: string,
    accountReference: string,
    transactionDesc: string,
  ): Promise<{
    checkoutRequestId: string;
    merchantRequestId: string;
    responseCode: string;
    responseDescription: string;
    customerMessage: string;
  }> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword(
      env.MPESA_SHORTCODE,
      env.MPESA_PASSKEY,
    );

    const payload = {
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(parseFloat(amount)),
      PartyA: phoneNumber,
      PartyB: env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const response = await this.http.post(this.stkPushUrl, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = response.data;

    return {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      responseCode: String(data.ResponseCode),
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage,
    };
  }

  clearTokenCache(): void {
    this.tokenCache = null;
  }
}

export const darajaService = new DarajaService();