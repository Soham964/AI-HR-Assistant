declare module "../firebase" {
  import { Auth } from "firebase/auth";
  export const auth: Auth;
}

export const auth = getAuth(app);

export {} 