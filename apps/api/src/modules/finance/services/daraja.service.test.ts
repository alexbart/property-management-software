import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DarajaService } from './daraja.service.js';

vi.mock('axios');
vi.mock('@/config/env', () => ({
  env: {
    MPESA_CONSUMER_KEY: 'test_key',
    MPESA_CONSUMER_SECRET: 'test_secret',
    MPESA_SHORTCODE: '174379',
    MPESA_PASSKEY: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    MPESA_ENVIRONMENT: 'sandbox',
    MPESA_CALLBACK_URL: 'https://api.example.com/api/v1/finance/mpesa/callback',
  },
}));

import axios from 'axios';

const mockedAxios = vi.mocked(axios);

describe('DarajaService', () => {
  let service: DarajaService;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

    mockGet = vi.fn();
    mockPost = vi.fn();

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: mockPost,
      defaults: { headers: {} },
    } as ReturnType<typeof axios.create>);

    service = new DarajaService();
    service.clearTokenCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('fetches token on first call', async () => {
      mockGet.mockResolvedValue({
        data: { access_token: 'token_123', expires_in: 3600 },
      });

      const token = await service.getAccessToken();

      expect(token).toBe('token_123');
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Basic dGVzdF9rZXk6dGVzdF9zZWNyZXQ=',
          }),
        }),
      );
    });

    it('caches token and returns cached value within expiry', async () => {
      mockGet.mockResolvedValue({
        data: { access_token: 'token_123', expires_in: 3600 },
      });

      const token1 = await service.getAccessToken();
      const token2 = await service.getAccessToken();

      expect(token1).toBe('token_123');
      expect(token2).toBe('token_123');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('refetches token after cache expires', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { access_token: 'token_1', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { access_token: 'token_2', expires_in: 3600 } });

      const token1 = await service.getAccessToken();
      expect(token1).toBe('token_1');

      vi.advanceTimersByTime(56 * 60 * 1000);

      const token2 = await service.getAccessToken();
      expect(token2).toBe('token_2');
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('generatePassword', () => {
    it('generates correct password and timestamp format', () => {
      const { password, timestamp } = service.generatePassword('174379', 'test_passkey');

      expect(timestamp).toMatch(/^\d{14}$/);
      expect(password).toBe(Buffer.from(`174379test_passkey${timestamp}`).toString('base64'));
    });

    it('uses current timestamp', () => {
      const before = new Date('2024-01-15T10:30:00Z').toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const { timestamp } = service.generatePassword('174379', 'passkey');
      const after = new Date('2024-01-15T10:30:00Z').toISOString().replace(/[-:T.]/g, '').slice(0, 14);

      const tsNum = parseInt(timestamp, 10);
      expect(tsNum).toBeGreaterThanOrEqual(parseInt(before, 10));
      expect(tsNum).toBeLessThanOrEqual(parseInt(after, 10));
    });
  });

  describe('initiateStkPush', () => {
    it('initiates STK push and returns parsed response', async () => {
      mockGet.mockResolvedValue({
        data: { access_token: 'access_token_123', expires_in: 3600 },
      });

      mockPost.mockResolvedValue({
        data: {
          CheckoutRequestID: 'ws_CO_123456',
          MerchantRequestID: 'mr_123456',
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          CustomerMessage: 'Success. Request accepted for processing',
        },
      });

      const result = await service.initiateStkPush(
        '254712345678',
        '15000.00',
        'LEASE-123',
        'Rent payment for January',
      );

      expect(result).toEqual({
        checkoutRequestId: 'ws_CO_123456',
        merchantRequestId: 'mr_123456',
        responseCode: '0',
        responseDescription: 'Success. Request accepted for processing',
        customerMessage: 'Success. Request accepted for processing',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        expect.objectContaining({
          BusinessShortCode: '174379',
          TransactionType: 'CustomerPayBillOnline',
          Amount: 15000,
          PartyA: '254712345678',
          PartyB: '174379',
          PhoneNumber: '254712345678',
          CallBackURL: 'https://api.example.com/api/v1/finance/mpesa/callback',
          AccountReference: 'LEASE-123',
          TransactionDesc: 'Rent payment for January',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access_token_123',
          }),
        }),
      );
    });

    it('floors amount to integer', async () => {
      mockGet.mockResolvedValue({
        data: { access_token: 'token', expires_in: 3600 },
      });

      mockPost.mockResolvedValue({
        data: {
          CheckoutRequestID: 'ws_CO_123',
          MerchantRequestID: 'mr_123',
          ResponseCode: '0',
          ResponseDescription: 'Success',
          CustomerMessage: 'Success',
        },
      });

      await service.initiateStkPush('254712345678', '15000.50', 'REF', 'DESC');

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ Amount: 15000 }),
        expect.any(Object),
      );
    });

    it('handles Safaricom error responses', async () => {
      mockGet.mockResolvedValue({
        data: { access_token: 'token', expires_in: 3600 },
      });

      mockPost.mockResolvedValue({
        data: {
          CheckoutRequestID: '',
          MerchantRequestID: '',
          ResponseCode: '1',
          ResponseDescription: 'Insufficient funds',
          CustomerMessage: 'Insufficient funds',
        },
      });

      const result = await service.initiateStkPush('254712345678', '15000', 'REF', 'DESC');

      expect(result.responseCode).toBe('1');
      expect(result.responseDescription).toBe('Insufficient funds');
    });
  });
});