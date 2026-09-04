"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  RotateCcw,
  ScanLine,
} from "lucide-react";

import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";

import { ModalHeader } from "@/app/components/common/ModalHeader";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PARKING_CAMERA_KEY =
  "syntra.parking-camera-device";

type CameraCapabilities =
  MediaTrackCapabilities & {
    focusMode?: string[];
    torch?: boolean;
  };

/* =========================================================
   ELEGIR CÁMARA
========================================================= */

function preferredCamera(
  devices: MediaDeviceInfo[],
) {
  const saved =
    localStorage.getItem(
      PARKING_CAMERA_KEY,
    );

  const remembered =
    devices.find(
      (device) =>
        device.deviceId === saved,
    );

  if (remembered) {
    return remembered;
  }

  const front =
    /front|frontal|user|selfie/i;

  const rear =
    /back|rear|environment|trasera|posterior/i;

  const secondary =
    /ultra|wide|gran angular|macro|telephoto|telefoto/i;

  const candidates =
    devices.filter(
      (device) =>
        !front.test(device.label),
    );

  return (
    candidates.find(
      (device) =>
        rear.test(device.label) &&
        !secondary.test(
          device.label,
        ),
    ) ??
    candidates.find(
      (device) =>
        !secondary.test(
          device.label,
        ),
    ) ??
    candidates[0] ??
    devices[0]
  );
}

/* =========================================================
   NOMBRE DE CÁMARA
========================================================= */

function cameraName(
  device: MediaDeviceInfo,
  index: number,
) {
  const label =
    device.label.trim();

  if (
    !label ||
    /^camera\s*\d*$/i.test(label)
  ) {
    return `Cámara ${index + 1}`;
  }

  return label
    .replace(
      /\s*\([^)]*\)\s*$/,
      " ",
    )
    .trim()
    .slice(0, 32);
}

/* =========================================================
   COMPONENTE
========================================================= */

type CameraScannerProps = {
  onDetected: (
    value: string,
  ) => void;
};

export function CameraScanner({
  onDetected,
}: CameraScannerProps) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const controlsRef =
    useRef<IScannerControls | null>(
      null,
    );

  const onDetectedRef =
    useRef(onDetected);

  onDetectedRef.current =
    onDetected;

  /* =======================================================
     STATE
  ======================================================= */

  const [
    status,
    setStatus,
  ] = useState(
    "Activando cámara…",
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    cameras,
    setCameras,
  ] = useState<
    MediaDeviceInfo[]
  >([]);

  const [
    selectedDeviceId,
    setSelectedDeviceId,
  ] = useState<
    string | null
  >(null);

  const [
    torchSupported,
    setTorchSupported,
  ] = useState(false);

  const [
    torchOn,
    setTorchOn,
  ] = useState(false);

  const [
    retry,
    setRetry,
  ] = useState(0);

  /* =======================================================
     INICIAR CÁMARA
  ======================================================= */

  useEffect(() => {
    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      setError(
        "Este navegador no permite usar la cámara. Abre ParkFlow mediante HTTPS o localhost.",
      );

      return;
    }

    let cancelled = false;
    let detected = false;

    const reader =
      new BrowserMultiFormatReader();

    setStatus(
      "Activando cámara…",
    );

    setError("");

    setTorchOn(false);

    setTorchSupported(false);

    async function start() {
      try {
        let cameraId =
          selectedDeviceId;

        /*
         * Si todavía no tenemos
         * una cámara seleccionada,
         * solicitamos permiso.
         */

        if (!cameraId) {
          const permission =
            await navigator.mediaDevices.getUserMedia(
              {
                audio: false,

                video: {
                  facingMode: {
                    ideal:
                      "environment",
                  },
                },
              },
            );

          permission
            .getTracks()
            .forEach(
              (track) =>
                track.stop(),
            );

          const devices =
            await BrowserMultiFormatReader.listVideoInputDevices();

          if (cancelled) {
            return;
          }

          setCameras(
            devices,
          );

          const selected =
            preferredCamera(
              devices,
            );

          if (!selected) {
            throw new DOMException(
              "No camera found",
              "NotFoundError",
            );
          }

          cameraId =
            selected.deviceId;

          setSelectedDeviceId(
            cameraId,
          );

          localStorage.setItem(
            PARKING_CAMERA_KEY,
            cameraId,
          );

          return;
        }

        /* =================================================
           INICIAR ZXING
        ================================================= */

        const controls =
          await reader.decodeFromConstraints(
            {
              audio: false,

              video: {
                deviceId: {
                  exact:
                    cameraId,
                },

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },

                frameRate: {
                  ideal: 30,
                },
              },
            },

            videoRef.current!,

            (result) => {
              if (
                cancelled ||
                detected ||
                !result
              ) {
                return;
              }

              detected =
                true;

              controlsRef.current?.stop();

              onDetectedRef.current(
                result.getText(),
              );
            },
          );

        if (
          cancelled ||
          detected
        ) {
          controls.stop();

          return;
        }

        controlsRef.current =
          controls;

        /* =================================================
           CAPACIDADES DE CÁMARA
        ================================================= */

        const capabilities =
          controls.streamVideoCapabilitiesGet?.(
            ((
              track: MediaStreamTrack,
            ) =>
              track.kind ===
              "video") as never,
          ) as
            | CameraCapabilities
            | undefined;

        /* =================================================
           ENFOQUE CONTINUO
        ================================================= */

        if (
          capabilities?.focusMode?.includes(
            "continuous",
          )
        ) {
          try {
            await controls.streamVideoConstraintsApply?.(
              {
                advanced: [
                  {
                    focusMode:
                      "continuous",
                  } as MediaTrackConstraintSet,
                ],
              },
            );
          } catch {
            // Algunos dispositivos
            // reportan soporte pero
            // rechazan la configuración.
          }
        }

        /* =================================================
           LINTERNA
        ================================================= */

        setTorchSupported(
          Boolean(
            capabilities?.torch &&
              controls.switchTorch,
          ),
        );

        /* =================================================
           ESTADO
        ================================================= */

        setStatus(
          capabilities?.focusMode?.includes(
            "continuous",
          )
            ? "Enfoque continuo activo · apunta al código"
            : "Apunta al QR o código de barras del boleto",
        );
      } catch (reason) {
        if (cancelled) {
          return;
        }

        const cameraError =
          reason as Error;

        /*
         * Si la cámara recordada
         * dejó de existir,
         * eliminamos la preferencia.
         */

        if (
          cameraError.name ===
            "OverconstrainedError" &&
          selectedDeviceId
        ) {
          localStorage.removeItem(
            PARKING_CAMERA_KEY,
          );

          setSelectedDeviceId(
            null,
          );

          return;
        }

        if (
          cameraError.name ===
          "NotAllowedError"
        ) {
          setError(
            "Permiso de cámara denegado. Habilítalo en la configuración del navegador.",
          );
        } else if (
          cameraError.name ===
          "NotFoundError"
        ) {
          setError(
            "No se encontró una cámara disponible.",
          );
        } else if (
          cameraError.name ===
          "NotReadableError"
        ) {
          setError(
            "La cámara está siendo usada por otra aplicación.",
          );
        } else {
          setError(
            "No fue posible abrir la cámara. Verifica HTTPS, permisos e inténtalo nuevamente.",
          );
        }

        setStatus("");
      }
    }

    void start();

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {
      cancelled = true;

      controlsRef.current?.stop();

      controlsRef.current =
        null;
    };
  }, [
    selectedDeviceId,
    retry,
  ]);

  /* =========================================================
     CAMBIAR CÁMARA
  ========================================================= */

  function selectCamera(
    deviceId: string,
  ) {
    controlsRef.current?.stop();

    controlsRef.current =
      null;

    localStorage.setItem(
      PARKING_CAMERA_KEY,
      deviceId,
    );

    setSelectedDeviceId(
      deviceId,
    );
  }

  /* =========================================================
     LINTERNA
  ========================================================= */

  async function toggleTorch() {
    if (
      !controlsRef.current
        ?.switchTorch
    ) {
      return;
    }

    try {
      const next =
        !torchOn;

      await controlsRef.current.switchTorch(
        next,
      );

      setTorchOn(next);
    } catch {
      setTorchSupported(
        false,
      );
    }
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="camera-scanner">

      <ModalHeader
        overline="LECTOR MÓVIL"
        title="Escanea el boleto"
        text="Lector homologado con Syntra POS: cámara trasera, enfoque continuo y selección de lente."
      />

      {/* VIDEO */}

      <div className="camera-viewport">

        <video
          ref={videoRef}
          playsInline
          muted
        />

        <span />

        <i />

      </div>

      {/* ERROR / ESTADO */}

      {error ? (
        <div className="camera-error">

          <AlertTriangle
            size={17}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setRetry(
                (value) =>
                  value + 1,
              )
            }
          >
            <RotateCcw
              size={14}
            />

            Reintentar
          </button>

        </div>
      ) : (
        <p>
          <ScanLine
            size={16}
          />

          {status}
        </p>
      )}

      {/* CONTROLES */}

      <div className="camera-controls">

        {cameras.length >
          1 && (
          <label>

            <span>
              CÁMARA
            </span>

            <select
              value={
                selectedDeviceId ??
                ""
              }
              onChange={(
                event,
              ) =>
                selectCamera(
                  event.target
                    .value,
                )
              }
            >
              {cameras.map(
                (
                  camera,
                  index,
                ) => (
                  <option
                    key={
                      camera.deviceId
                    }
                    value={
                      camera.deviceId
                    }
                  >
                    {cameraName(
                      camera,
                      index,
                    )}
                  </option>
                ),
              )}
            </select>

          </label>
        )}

        {torchSupported && (
          <button
            type="button"
            className={
              torchOn
                ? "active"
                : ""
            }
            onClick={() =>
              void toggleTorch()
            }
          >
            {torchOn
              ? "Apagar luz"
              : "Encender luz"}
          </button>
        )}

      </div>

      <small>
        Coloca el código dentro
        del marco a 15–25 cm. Si
        no enfoca, selecciona
        otro lente.
      </small>

    </div>
  );
}