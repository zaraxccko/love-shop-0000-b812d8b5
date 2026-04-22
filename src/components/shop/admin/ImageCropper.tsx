import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ImageCropperProps {
  open: boolean;
  src: string | null;
  /** Output edge size in px. Default 512. */
  size?: number;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

/**
 * Квадратный редактор изображения как в Telegram:
 * - перетаскивание мышью / пальцем
 * - зум слайдером
 * - предпросмотр в круглой/квадратной маске (то, что видит юзер)
 * - на выходе обрезанный квадратный PNG (data URL)
 */
export const ImageCropper = ({ open, src, size = 512, onCancel, onConfirm }: ImageCropperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1); // 1 = «cover» базовый
  const [pos, setPos] = useState({ x: 0, y: 0 }); // px смещения относительно центра
  const [box, setBox] = useState(320); // визуальный размер квадрата

  // Загружаем размеры
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      imgRef.current = img;
      setScale(1);
      setPos({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  // Адаптируем размер контейнера к ширине окна
  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.clientWidth ?? 320;
      setBox(Math.min(w, 360));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  // Базовый «cover» размер картинки внутри квадрата
  const baseSize = (() => {
    if (!natural) return { w: box, h: box };
    const r = natural.w / natural.h;
    if (r >= 1) {
      // широкая → высота = box
      return { w: box * r, h: box };
    }
    return { w: box, h: box / r };
  })();

  const drawnW = baseSize.w * scale;
  const drawnH = baseSize.h * scale;

  // Ограничения, чтобы картинка не уезжала за пределы квадрата
  const clamp = (p: { x: number; y: number }) => {
    const maxX = Math.max(0, (drawnW - box) / 2);
    const maxY = Math.max(0, (drawnH - box) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    };
  };

  useEffect(() => {
    setPos((p) => clamp(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, box, natural]);

  // Drag
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!imgRef.current || !natural) return;
    // Соотношение пиксели исходника / пиксели на экране в режиме «cover»
    // baseSize.w / box === naturalRatio для широких; используем масштаб от natural.
    const natPerCss = natural.w / baseSize.w; // одинаков по обоим осям
    // Видимый квадрат = box, в координатах исходника = box * natPerCss / scale
    const cropSize = (box * natPerCss) / scale;
    // Центр исходника + смещение (в пикселях исходника, инвертируем т.к. pos — смещение картинки)
    const cx = natural.w / 2 - (pos.x * natPerCss) / scale;
    const cy = natural.h / 2 - (pos.y * natPerCss) / scale;
    const sx = Math.max(0, cx - cropSize / 2);
    const sy = Math.max(0, cy - cropSize / 2);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, cropSize, cropSize, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Кадрирование изображения</DialogTitle>
        </DialogHeader>

        {src && (
          <div className="space-y-4">
            <div ref={containerRef} className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-2xl bg-muted touch-none select-none cursor-grab active:cursor-grabbing"
                style={{ width: box, height: box }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* Картинка */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: drawnW,
                    height: drawnH,
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                  }}
                />
                {/* Сетка */}
                <div className="pointer-events-none absolute inset-0 ring-2 ring-background/60 rounded-2xl" />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-0 top-1/3 border-t border-white/30" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-white/30" />
                  <div className="absolute inset-y-0 left-1/3 border-l border-white/30" />
                  <div className="absolute inset-y-0 left-2/3 border-l border-white/30" />
                </div>
              </div>
            </div>

            <div className="px-2">
              <div className="text-xs text-muted-foreground mb-1">Масштаб</div>
              <Slider
                value={[scale]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(v) => setScale(v[0])}
              />
            </div>

            <div className="text-[11px] text-muted-foreground text-center">
              Перетащите картинку, чтобы выбрать видимую область
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel}>Отмена</Button>
          <Button onClick={handleConfirm}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
