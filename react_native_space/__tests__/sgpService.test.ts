import { sgpService } from '../src/services/sgpService';

describe('SGPService', () => {
  describe('getMockUser', () => {
    it('should return mock user data', () => {
      const user = sgpService.getMockUser('12345678909');
      
      expect(user).toBeDefined();
      expect(user.cpfCnpj).toBe('12345678909');
      expect(user.name).toBe('GILCEU');
      expect(user.contracts).toHaveLength(3);
      expect(user.contracts[0].plan.type).toBe('FIBRA');
    });
  });
});