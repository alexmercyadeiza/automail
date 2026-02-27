import { createContext, useContext, useState } from "react";

type ObscureContextType = {
  obscured: boolean;
  toggle: () => void;
};

const ObscureContext = createContext<ObscureContextType>({
  obscured: false,
  toggle: () => {},
});

export function ObscureProvider({ children }: { children: React.ReactNode }) {
  const [obscured, setObscured] = useState(true);
  return (
    <ObscureContext.Provider
      value={{ obscured, toggle: () => setObscured((p) => !p) }}
    >
      {children}
    </ObscureContext.Provider>
  );
}

export function useObscure() {
  return useContext(ObscureContext);
}
