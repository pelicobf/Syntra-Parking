"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  ChevronRight,
  Copy,
  KeyRound,
  Search,
  UserPlus,
} from "lucide-react";

import { ModalHeader } from "@/app/components/common/ModalHeader";
import { AccessModuleIcon } from "@/app/components/staff/AccessModuleIcon";

import {
  accessModules,
  rolePermissionDefaults,
} from "@/app/config/permissions";

import {
  getRoleLabel,
  roleOptions,
} from "@/app/config/roles";

import { useParkingStore } from "@/app/hooks/use-parking-store";

type Props = {
  store: ReturnType<
    typeof useParkingStore
  >;

  notify: (
    value: string,
  ) => void;
};

export function Staff({
  store,
  notify,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [saving, setSaving] =
    useState(false);

  const [
    credentials,
    setCredentials,
  ] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState("operator");

  const [lotId, setLotId] =
    useState(store.lotId);

  const [active, setActive] =
    useState(true);

  const [
    permissionCodes,
    setPermissionCodes,
  ] = useState<string[]>(
    rolePermissionDefaults.operator,
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [query, setQuery] =
    useState("");

  const [status, setStatus] =
    useState<
      | "all"
      | "active"
      | "inactive"
    >("all");

  const availableLots =
    store.lots.filter(
      (lot) =>
        store.profile.role ===
          "super_admin" ||
        store.profile.allowedLotIds.includes(
          lot.id,
        ),
    );

  const allowedRoles =
    store.profile.role ===
    "super_admin"
      ? [
          "owner",
          "admin",
          "cashier",
          "operator",
          "viewer",
        ]
      : store.profile.role ===
        "owner"
      ? [
          "admin",
          "cashier",
          "operator",
          "viewer",
        ]
      : [
          "cashier",
          "operator",
          "viewer",
        ];

  const filteredStaff =
    store.staff.filter(
      (user) =>
        (status === "all" ||
          (status === "active"
            ? user.status ===
              "active"
            : user.status !==
              "active")) &&
        `${user.fullName} ${user.email} ${getRoleLabel(
          user.role,
        )}`
          .toLowerCase()
          .includes(
            query.toLowerCase(),
          ),
    );

  function close() {
    if (saving) {
      return;
    }

    setOpen(false);
    setCredentials(null);
  }

  function openCreate() {
    setEditingId(null);

    setName("");
    setEmail("");

    setRole("operator");

    setLotId(
      availableLots[0]?.id ??
        store.lotId,
    );

    setActive(true);

    setPermissionCodes(
      rolePermissionDefaults.operator,
    );

    setPassword("");
    setConfirmPassword("");

    setCredentials(null);

    setOpen(true);
  }

  function openEdit(
    user: (typeof store.staff)[number],
  ) {
    setEditingId(user.id);

    setName(
      user.fullName,
    );

    setEmail(
      user.email ===
      "Usuario registrado"
        ? ""
        : user.email,
    );

    setRole(user.role);

    setLotId(
      user.lotIds[0] ??
        availableLots[0]?.id ??
        store.lotId,
    );

    setActive(
      user.status ===
        "active",
    );

    setPermissionCodes(
      user.permissionCodes.length
        ? user.permissionCodes
        : rolePermissionDefaults[
            user.role
          ] ?? [],
    );

    setPassword("");

    setConfirmPassword("");

    setCredentials(null);

    setOpen(true);
  }

  function selectRole(
    nextRole: string,
  ) {
    setRole(nextRole);

    setPermissionCodes(
      rolePermissionDefaults[
        nextRole
      ] ?? [],
    );
  }

  function moduleLevel(
    item: (typeof accessModules)[number],
  ) {
    if (
      !permissionCodes.includes(
        item.view,
      )
    ) {
      return "none";
    }

    return item.manage.length &&
      item.manage.every((code) =>
        permissionCodes.includes(
          code,
        ),
      )
      ? "manage"
      : "view";
  }

  function toggleModule(
    item: (typeof accessModules)[number],
  ) {
    const level =
      moduleLevel(item);

    setModuleAccess(
      item,
      level === "none"
        ? "view"
        : "none",
    );
  }

  function setModuleAccess(
    item: (typeof accessModules)[number],
    level:
      | "none"
      | "view"
      | "manage",
  ) {
    setPermissionCodes(
      (current) => {
        const removed =
          current.filter(
            (code) =>
              code !==
                item.view &&
              !item.manage.includes(
                code,
              ),
          );

        if (level === "none") {
          return removed;
        }

        if (level === "view") {
          return [
            ...removed,
            item.view,
          ];
        }

        return [
          ...removed,
          item.view,
          ...item.manage,
        ];
      },
    );
  }

  function generatePassword() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

    const bytes =
      crypto.getRandomValues(
        new Uint8Array(14),
      );

    const value =
      Array.from(
        bytes,
        (byte) =>
          chars[
            byte %
              chars.length
          ],
      ).join("");

    setPassword(value);

    setConfirmPassword(
      value,
    );
  }

  async function submit(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (
      !permissionCodes.length
    ) {
      notify(
        "Asigna al menos un módulo",
      );

      return;
    }

    if (
      password &&
      password.length < 8
    ) {
      notify(
        "La contraseña debe tener al menos 8 caracteres",
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      notify(
        "Las contraseñas no coinciden",
      );

      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await store.updateStaff({
          id: editingId,

          fullName:
            name.trim(),

          email:
            email.trim() ||
            undefined,

          role,

          lotIds: [lotId],

          permissionCodes,

          active,

          newPassword:
            password ||
            undefined,
        });

        setOpen(false);

        notify(
          "Usuario actualizado correctamente",
        );
      } else {
        const created =
          await store.inviteStaff(
            {
              fullName:
                name.trim(),

              email:
                email.trim(),

              role,

              lotIds: [
                lotId,
              ],

              permissionCodes,
            },
          );

        setCredentials({
          name:
            created.fullName,

          email:
            created.email,

          password:
            created.temporaryPassword,
        });

        notify(
          "Usuario creado correctamente",
        );
      }
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el usuario",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyCredentials() {
    if (!credentials) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `Usuario: ${credentials.email}\nContraseña temporal: ${credentials.password}`,
      );

      notify(
        "Credenciales copiadas",
      );
    } catch {
      notify(
        "No fue posible copiar las credenciales",
      );
    }
  }

  return (
    <div className="screen staff-v2">

      <section className="staff-toolbar">

        <div className="staff-search">
          <Search size={17} />

          <input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value,
              )
            }
            placeholder="Buscar nombre, correo o rol"
          />
        </div>

        <div className="staff-status-filters">

          {(
            [
              [
                "all",
                `Todos ${store.staff.length}`,
              ],

              [
                "active",
                `Activos ${
                  store.staff.filter(
                    (user) =>
                      user.status ===
                      "active",
                  ).length
                }`,
              ],

              [
                "inactive",
                `Inactivos ${
                  store.staff.filter(
                    (user) =>
                      user.status !==
                      "active",
                  ).length
                }`,
              ],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                className={
                  status === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatus(value)
                }
              >
                {label}
              </button>
            ),
          )}

        </div>

        <button
          className="primary"
          onClick={openCreate}
        >
          <UserPlus
            size={16}
          />

          Nuevo usuario
        </button>

      </section>

      <section className="staff-list">

        <header>
          <span>USUARIO</span>
          <span>ACCESO</span>
          <span>MÓDULOS</span>
          <span>ESTADO</span>
          <i />
        </header>

        {filteredStaff.map(
          (user) => (
            <button
              className={`staff-list-row ${
                user.status !==
                "active"
                  ? "inactive"
                  : ""
              }`}
              key={user.id}
              onClick={() =>
                openEdit(user)
              }
            >
              <span className="staff-identity">

                <i>
                  {user.fullName
                    .split(" ")
                    .map(
                      (value) =>
                        value[0],
                    )
                    .join("")
                    .slice(
                      0,
                      2,
                    )}
                </i>

                <b>
                  {user.fullName}

                  <small>
                    {user.email}
                  </small>
                </b>

              </span>

              <span>
                <em>
                  {getRoleLabel(
                    user.role,
                  )}
                </em>

                <small>
                  {user.lotIds
                    .map(
                      (id) =>
                        store.lots.find(
                          (lot) =>
                            lot.id ===
                            id,
                        )?.name,
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>

              <span>
                <b>
                  {user.permissionCodes
                    .length
                    ? accessModules.filter(
                        (item) =>
                          user.permissionCodes.includes(
                            item.view,
                          ),
                      ).length
                    : (
                        rolePermissionDefaults[
                          user.role
                        ] ?? []
                      ).filter(
                        (code) =>
                          accessModules.some(
                            (item) =>
                              item.view ===
                              code,
                          ),
                      ).length}
                </b>

                <small>
                  módulos asignados
                </small>
              </span>

              <span
                className={`staff-state ${user.status}`}
              >
                <i />

                {user.status ===
                "active"
                  ? "Activo"
                  : "Inactivo"}
              </span>

              <ChevronRight />

            </button>
          ),
        )}

        {!filteredStaff.length && (
          <div className="empty">
            No encontramos usuarios
            con estos filtros.
          </div>
        )}

      </section>

      {open && (
        <div
          className="backdrop"
          onMouseDown={close}
        >
          <section
            className="modal staff-access-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close"
              onClick={close}
            >
              ×
            </button>

            {credentials ? (
              <div className="credential-success">

                <span className="credential-success-icon">
                  <CheckCircle2 />
                </span>

                <p className="eyebrow">
                  USUARIO CREADO
                </p>

                <h2>
                  Acceso listo
                </h2>

                <p>
                  {credentials.name} ya
                  puede iniciar sesión.
                  La contraseña solo se
                  mostrará esta vez.
                </p>

                <div className="credential-box">

                  <label>
                    Correo

                    <strong>
                      {
                        credentials.email
                      }
                    </strong>
                  </label>

                  <label>
                    Contraseña temporal

                    <strong className="temporary-password">
                      {
                        credentials.password
                      }
                    </strong>
                  </label>

                  <button
                    className="secondary copy-credentials"
                    onClick={() =>
                      void copyCredentials()
                    }
                  >
                    <Copy
                      size={16}
                    />

                    Copiar credenciales
                  </button>

                </div>

                <button
                  className="primary full"
                  onClick={close}
                >
                  Entendido
                </button>

              </div>
            ) : (
              <form
                onSubmit={submit}
              >
                <ModalHeader
                  overline={
                    editingId
                      ? "EDITAR USUARIO"
                      : "NUEVO USUARIO"
                  }
                  title={
                    editingId
                      ? name ||
                        "Actualizar usuario"
                      : "Crear acceso"
                  }
                  text={
                    editingId
                      ? email ||
                        "Actualiza identidad, módulos y permisos."
                      : "Crea un miembro del equipo y genera una contraseña temporal."
                  }
                />

                <section className="access-form-section">

                  <header>
                    <KeyRound />

                    <div>
                      <b>
                        Datos de acceso
                      </b>

                      <small>
                        Identidad y
                        sucursal
                        principal del
                        colaborador.
                      </small>
                    </div>
                  </header>

                  <div className="staff-modal-grid">

                    <label>
                      Nombre completo

                      <input
                        autoFocus
                        value={name}
                        onChange={(e) =>
                          setName(
                            e.target
                              .value,
                          )
                        }
                        placeholder="Ana Torres"
                        required
                      />
                    </label>

                    <label>
                      Correo electrónico

                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(
                            e.target
                              .value,
                          )
                        }
                        placeholder="ana@negocio.com"
                        required={
                          !editingId
                        }
                      />
                    </label>

                    <label>
                      Sucursal asignada

                      <select
                        value={lotId}
                        onChange={(e) =>
                          setLotId(
                            e.target
                              .value,
                          )
                        }
                      >
                        {availableLots.map(
                          (lot) => (
                            <option
                              value={
                                lot.id
                              }
                              key={
                                lot.id
                              }
                            >
                              {
                                lot.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    {editingId && (
                      <label>
                        Estado

                        <select
                          value={
                            active
                              ? "active"
                              : "inactive"
                          }
                          onChange={(e) =>
                            setActive(
                              e.target
                                .value ===
                                "active",
                            )
                          }
                        >
                          <option value="active">
                            Activo
                          </option>

                          <option value="inactive">
                            Inactivo
                          </option>
                        </select>
                      </label>
                    )}

                  </div>

                </section>

                <section className="role-selector">

                  <h3>Rol</h3>

                  <div>
                    {roleOptions
                      .filter(
                        (option) =>
                          allowedRoles.includes(
                            option.id,
                          ),
                      )
                      .map(
                        (option) => (
                          <button
                            type="button"
                            key={
                              option.id
                            }
                            className={
                              role ===
                              option.id
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              selectRole(
                                option.id,
                              )
                            }
                          >
                            <i>
                              {role ===
                                option.id && (
                                <span />
                              )}
                            </i>

                            <b>
                              {
                                option.label
                              }

                              <small>
                                {
                                  option.description
                                }
                              </small>
                            </b>

                          </button>
                        ),
                      )}
                  </div>

                </section>

                <section className="syntra-module-selector">

                  <header>
                    <div>
                      <h3>
                        Módulos a operar
                      </h3>

                      <p>
                        Activa cada
                        módulo y define
                        si puede
                        consultar o
                        administrar.
                      </p>
                    </div>

                    <em>
                      {
                        accessModules.filter(
                          (item) =>
                            permissionCodes.includes(
                              item.view,
                            ),
                        ).length
                      }{" "}
                      seleccionados
                    </em>
                  </header>

                  <div className="syntra-module-grid">

                    {accessModules.map(
                      (item) => {
                        const level =
                          moduleLevel(
                            item,
                          );

                        const activeModule =
                          level !==
                          "none";

                        return (
                          <article
                            className={
                              activeModule
                                ? "active"
                                : ""
                            }
                            key={
                              item.id
                            }
                          >
                            <button
                              type="button"
                              className="module-main"
                              onClick={() =>
                                toggleModule(
                                  item,
                                )
                              }
                            >
                              <span>
                                <AccessModuleIcon
                                  id={
                                    item.id
                                  }
                                />
                              </span>

                              <b>
                                {
                                  item.label
                                }

                                <small>
                                  {
                                    item.description
                                  }
                                </small>
                              </b>

                              <i>
                                {activeModule &&
                                  "✓"}
                              </i>
                            </button>

                            {activeModule && (
                              <div className="module-actions">

                                <button
                                  type="button"
                                  className={
                                    level ===
                                    "view"
                                      ? "active"
                                      : ""
                                  }
                                  onClick={() =>
                                    setModuleAccess(
                                      item,
                                      "view",
                                    )
                                  }
                                >
                                  Consultar
                                </button>

                                {item.manage
                                  .length >
                                  0 && (
                                  <button
                                    type="button"
                                    className={
                                      level ===
                                      "manage"
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() =>
                                      setModuleAccess(
                                        item,
                                        "manage",
                                      )
                                    }
                                  >
                                    {item.id ===
                                    "entries"
                                      ? "Operar"
                                      : item.id ===
                                        "reports"
                                      ? "Exportar"
                                      : "Administrar"}
                                  </button>
                                )}

                              </div>
                            )}

                          </article>
                        );
                      },
                    )}

                  </div>

                </section>

                {editingId && (
                  <section className="access-form-section password-section">

                    <header>
                      <KeyRound />

                      <div>
                        <b>
                          Nueva contraseña
                        </b>

                        <small>
                          Opcional.
                        </small>
                      </div>

                      <button
                        type="button"
                        className="secondary"
                        onClick={
                          generatePassword
                        }
                      >
                        Generar segura
                      </button>
                    </header>

                    <div className="staff-modal-grid">

                      <label>
                        Nueva contraseña

                        <input
                          type="text"
                          value={
                            password
                          }
                          onChange={(e) =>
                            setPassword(
                              e.target
                                .value,
                            )
                          }
                          minLength={8}
                        />
                      </label>

                      <label>
                        Confirmar contraseña

                        <input
                          type="text"
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
                        />
                      </label>

                    </div>

                  </section>
                )}

                <footer className="staff-modal-footer">

                  <button
                    type="button"
                    className="secondary"
                    onClick={close}
                  >
                    Cancelar
                  </button>

                  <button
                    className="primary"
                    disabled={
                      saving ||
                      !permissionCodes.length
                    }
                  >
                    {saving
                      ? "Guardando…"
                      : editingId
                      ? "Guardar cambios"
                      : "Crear usuario"}
                  </button>

                </footer>

              </form>
            )}

          </section>
        </div>
      )}

    </div>
  );
}