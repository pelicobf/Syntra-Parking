"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import {
  LoginScreen as SyntraLogin,
  type SignInResult as SyntraSignInResult,
} from "@syntra/login";

type RegisterBusinessInput = {
  name: string;
  slug: string;
  lotName: string;
  lotCode: string;
  capacity: number;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

type Props = {
  error: string;

  saving: boolean;

  onLogin: (
    identifier: string,
    password: string,
  ) => Promise<SyntraSignInResult>;

  onRegister: (
    input: RegisterBusinessInput,
  ) => Promise<void>;
};

export function LoginScreen({
  error,
  saving,
  onLogin,
  onRegister,
}: Props) {
  const [
    registering,
    setRegistering,
  ] = useState(false);

  const [step, setStep] =
    useState(1);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [
    lotName,
    setLotName,
  ] = useState(
    "Sucursal principal",
  );

  const [
    lotCode,
    setLotCode,
  ] = useState("MATRIZ");

  const [
    capacity,
    setCapacity,
  ] = useState(100);

  const [
    ownerName,
    setOwnerName,
  ] = useState("");

  const [
    ownerEmail,
    setOwnerEmail,
  ] = useState("");

  const [
    ownerPassword,
    setOwnerPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  function back() {
    if (step > 1) {
      setStep(
        (value) =>
          value - 1,
      );
    } else {
      setRegistering(
        false,
      );

      setFormError("");
    }
  }

  function next() {
    setFormError("");

    if (
      step === 1 &&
      (!name.trim() ||
        !slug.trim())
    ) {
      setFormError(
        "Completa el nombre de la empresa.",
      );

      return;
    }

    if (
      step === 2 &&
      (!lotName.trim() ||
        !lotCode.trim() ||
        capacity < 1)
    ) {
      setFormError(
        "Completa los datos de la primera sucursal.",
      );

      return;
    }

    setStep(
      (value) =>
        Math.min(
          3,
          value + 1,
        ),
    );
  }

  async function create(
    e: FormEvent,
  ) {
    e.preventDefault();

    setFormError("");

    if (
      !ownerName.trim() ||
      !ownerEmail.trim()
    ) {
      setFormError(
        "Completa los datos del propietario.",
      );

      return;
    }

    if (
      ownerPassword.length <
      8
    ) {
      setFormError(
        "La contraseña debe tener al menos 8 caracteres.",
      );

      return;
    }

    if (
      ownerPassword !==
      confirmPassword
    ) {
      setFormError(
        "Las contraseñas no coinciden.",
      );

      return;
    }

    try {
      await onRegister({
        name,
        slug,
        lotName,
        lotCode,
        capacity,
        ownerName,
        ownerEmail,
        ownerPassword,
      });
    } catch {
      // El error lo maneja page.tsx
    }
  }

  if (registering) {
    return (
      <main className="onboarding-screen">

        <aside className="onboarding-brand">

          <img
            src="/syntra/logo-wordmark-dark.png"
            alt="Syntra Software"
          />

          <div>
            <p>
              CONFIGURA TU ESPACIO
            </p>

            <h1>
              Tu estacionamiento
              listo para operar.
            </h1>

            <span>
              Registra tu empresa,
              primera sucursal y
              cuenta propietaria en
              tres pasos.
            </span>
          </div>

          <nav>
            {[
              [1, "Empresa"],
              [2, "Sucursal"],
              [
                3,
                "Propietario",
              ],
            ].map(
              ([n, label]) => (
                <div
                  key={n}
                  className={
                    step >= Number(n)
                      ? "active"
                      : ""
                  }
                >
                  <i>
                    {step >
                    Number(n)
                      ? "✓"
                      : n}
                  </i>

                  <b>{label}</b>
                </div>
              ),
            )}
          </nav>

          <small>
            SYNTRA PARKFLOW ·
            GESTIÓN PROFESIONAL
          </small>

        </aside>

        <section className="onboarding-form">

          <button
            className="onboarding-back"
            onClick={back}
          >
            ←{" "}
            {step === 1
              ? "Volver al acceso"
              : "Anterior"}
          </button>

          <form
            onSubmit={create}
          >
            <p className="eyebrow">
              PASO {step} DE 3
            </p>

            {step === 1 && (
              <>
                <h2>
                  Cuéntanos sobre tu
                  empresa
                </h2>

                <p className="onboarding-copy">
                  Esta información
                  identificará tu
                  cuenta y aparecerá
                  en la operación del
                  estacionamiento.
                </p>

                <label>
                  Nombre comercial

                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      const value =
                        e.target
                          .value;

                      setName(
                        value,
                      );

                      setSlug(
                        value
                          .toLowerCase()
                          .normalize(
                            "NFD",
                          )
                          .replace(
                            /[\u0300-\u036f]/g,
                            "",
                          )
                          .replace(
                            /[^a-z0-9]+/g,
                            "-",
                          )
                          .replace(
                            /^-|-$/g,
                            "",
                          ),
                      );
                    }}
                    placeholder="Ej. Estacionamientos del Centro"
                    required
                  />
                </label>

                <label>
                  Identificador del
                  sistema

                  <input
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(
                            /[^a-z0-9-]/g,
                            "",
                          ),
                      )
                    }
                    placeholder="estacionamientos-del-centro"
                    required
                  />

                  <small>
                    Se genera
                    automáticamente y
                    puedes ajustarlo.
                  </small>
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <h2>
                  Configura tu primera
                  sucursal
                </h2>

                <p className="onboarding-copy">
                  Podrás agregar
                  nuevas ubicaciones
                  cuando ingreses al
                  sistema.
                </p>

                <div className="form-grid">

                  <label>
                    Nombre de sucursal

                    <input
                      autoFocus
                      value={
                        lotName
                      }
                      onChange={(e) =>
                        setLotName(
                          e.target
                            .value,
                        )
                      }
                      placeholder="Sucursal principal"
                      required
                    />
                  </label>

                  <label>
                    Código

                    <input
                      value={
                        lotCode
                      }
                      onChange={(e) =>
                        setLotCode(
                          e.target
                            .value.toUpperCase(),
                        )
                      }
                      maxLength={8}
                      placeholder="MATRIZ"
                      required
                    />
                  </label>

                </div>

                <label>
                  Capacidad total

                  <input
                    type="number"
                    min={1}
                    value={
                      capacity
                    }
                    onChange={(e) =>
                      setCapacity(
                        Number(
                          e.target
                            .value,
                        ),
                      )
                    }
                    required
                  />

                  <small>
                    Número de cajones
                    disponibles en
                    esta ubicación.
                  </small>
                </label>
              </>
            )}

            {step === 3 && (
              <>
                <h2>
                  Crea tu cuenta
                  propietaria
                </h2>

                <p className="onboarding-copy">
                  Tendrás control
                  completo de
                  sucursales,
                  tarifas, usuarios y
                  reportes.
                </p>

                <div className="form-grid">

                  <label>
                    Nombre completo

                    <input
                      autoFocus
                      value={
                        ownerName
                      }
                      onChange={(e) =>
                        setOwnerName(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="name"
                      placeholder="Tu nombre"
                      required
                    />
                  </label>

                  <label>
                    Correo electrónico

                    <input
                      type="email"
                      value={
                        ownerEmail
                      }
                      onChange={(e) =>
                        setOwnerEmail(
                          e.target
                            .value,
                        )
                      }
                      autoComplete="email"
                      placeholder="propietario@empresa.com"
                      required
                    />
                  </label>

                  <label>
                    Contraseña

                    <input
                      type="password"
                      value={
                        ownerPassword
                      }
                      onChange={(e) =>
                        setOwnerPassword(
                          e.target
                            .value,
                        )
                      }
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </label>

                  <label>
                    Confirmar
                    contraseña

                    <input
                      type="password"
                      value={
                        confirmPassword
                      }
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target
                            .value,
                        )
                      }
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Repite la contraseña"
                      required
                    />
                  </label>

                </div>

                <div className="creation-summary">

                  <CheckCircle2 />

                  <p>
                    La cuenta quedará
                    activa
                    inmediatamente. No
                    se enviarán enlaces
                    mágicos.
                  </p>

                </div>
              </>
            )}

            {(formError ||
              error) && (
              <div className="onboarding-error">
                {formError ||
                  error}
              </div>
            )}

            <footer>

              {step < 3 ? (
                <button
                  type="button"
                  className="primary full"
                  onClick={next}
                >
                  Continuar

                  <ChevronRight
                    size={17}
                  />
                </button>
              ) : (
                <button
                  className="primary full"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Creando tu empresa…"
                    : "Crear empresa y comenzar"}
                </button>
              )}

              <small>
                Al continuar aceptas
                los términos de
                servicio y el aviso de
                privacidad.
              </small>

            </footer>

          </form>

        </section>

      </main>
    );
  }

  return (
    <SyntraLogin
      onSignIn={onLogin}
      onCreateBusiness={() => {
        setRegistering(true);
        setStep(1);
      }}
      text={{
        subtitle:
          "Control profesional para estacionamientos",
      }}
    />
  );
}