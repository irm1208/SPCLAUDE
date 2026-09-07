export interface SellerSignupForm {
  name: string;
  tagline: string;
  contactTelegram: string;
  country: string;
  shipsTo: string;
  password: string;
  confirmPassword: string;
}

export interface SellerSignupBody {
  name: string;
  tagline: string | null;
  contactTelegram: string;
  country: string | null;
  shipsTo: string | null;
  password: string;
  turnstileToken: string;
}

export function canSubmitSellerSignup(
  form: SellerSignupForm,
  turnstileToken: string,
): boolean {
  return Boolean(
    form.name.trim()
    && form.contactTelegram.trim()
    && form.password.length >= 8
    && form.password === form.confirmPassword
    && turnstileToken.trim(),
  );
}

export function buildSellerSignupBody(
  form: SellerSignupForm,
  turnstileToken: string,
): SellerSignupBody {
  const token = turnstileToken.trim();
  if (!token) {
    throw new Error("Please complete the security check");
  }

  return {
    name: form.name.trim(),
    tagline: form.tagline.trim() || null,
    contactTelegram: form.contactTelegram.trim().replace(/^@/, ""),
    country: form.country.trim() || null,
    shipsTo: form.shipsTo || null,
    password: form.password,
    turnstileToken: token,
  };
}