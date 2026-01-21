import { validateCPF, validateCNPJ, validateCPForCNPJ } from '../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateCPF', () => {
    it('should validate correct CPF', () => {
      expect(validateCPF('123.456.789-09')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      expect(validateCPF('123.456.789-00')).toBe(false);
      expect(validateCPF('111.111.111-11')).toBe(false);
    });
  });

  describe('validateCNPJ', () => {
    it('should reject invalid CNPJ', () => {
      expect(validateCNPJ('11.111.111/1111-11')).toBe(false);
    });
  });

  describe('validateCPForCNPJ', () => {
    it('should validate CPF or CNPJ', () => {
      expect(validateCPForCNPJ('123.456.789-09')).toBe(true);
      expect(validateCPForCNPJ('invalid')).toBe(false);
    });
  });
});