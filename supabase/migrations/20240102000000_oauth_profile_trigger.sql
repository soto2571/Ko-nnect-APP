-- Auto-create a public.users profile when a user signs in via OAuth (Google, Apple, etc.)
-- Email/password users are handled by the auth-signup Edge Function instead.

CREATE OR REPLACE FUNCTION public.handle_oauth_user()
RETURNS trigger AS $$
BEGIN
  -- Skip email/password users — their profiles are created by the Edge Function
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'email' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users ("userId", email, "firstName", "lastName", role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'given_name',
             split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1)),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
      NULLIF(split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), ''),
      ''
    ),
    'owner'  -- Google sign-ups are business owners; role can be changed later
  )
  ON CONFLICT ("userId") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_oauth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_oauth_user();
