import { describe, expect, it } from "vitest";
import {
  validateBookingForm,
  validateEmail,
  validatePhone,
  validateRequired,
} from "./formValidation";

describe("Form Validation", () => {
  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@example.co.uk")).toBe(true);
      expect(validateEmail("user+tag@example.com")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("invalid@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("invalid@example")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validatePhone", () => {
    it("should validate Swedish phone numbers", () => {
      expect(validatePhone("+46701234567")).toBe(true);
      expect(validatePhone("0701234567")).toBe(true);
      expect(validatePhone("+46 70 123 45 67")).toBe(true);
      expect(validatePhone("070-123-45-67")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(validatePhone("123")).toBe(false);
      expect(validatePhone("07012345")).toBe(false); // Too short
      expect(validatePhone("+4670123456789")).toBe(false); // Too long
      expect(validatePhone("")).toBe(false);
    });
  });

  describe("validateRequired", () => {
    it("should validate non-empty strings", () => {
      expect(validateRequired("test")).toBe(true);
      expect(validateRequired("  test  ")).toBe(true);
    });

    it("should reject empty or whitespace-only strings", () => {
      expect(validateRequired("")).toBe(false);
      expect(validateRequired("   ")).toBe(false);
    });
  });

  describe("validateBookingForm", () => {
    it("should validate a complete valid form", () => {
      const result = validateBookingForm({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+46701234567",
      });

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("should return errors for missing required fields", () => {
      const result = validateBookingForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.firstName).toBeDefined();
      expect(result.errors.lastName).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    });

    it("should validate email format", () => {
      const result = validateBookingForm({
        firstName: "John",
        lastName: "Doe",
        email: "invalid-email",
        phone: "+46701234567",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe("Ogiltig e-postadress");
    });

    it("should validate phone format", () => {
      const result = validateBookingForm({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "123",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe("Ogiltigt telefonnummer");
    });
  });
});
