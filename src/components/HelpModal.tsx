import React from 'react';
import { X, Smartphone, Monitor, Magnet } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Panduan Penggunaan Perabot 3D"
      >
        <div className="modal-header">
          <h3>Panduan Kontrol & Snap Pintar</h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-grid">
          <div className="help-box">
            <div className="help-box-title">
              <Smartphone size={16} />
              <span>Layar Sentuh (HP / Tablet)</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>1 Jari Geser</strong> — Putar sudut kamera 3D
              </li>
              <li>
                <strong>2 Jari Cubit / Geser</strong> — Zoom & geser kamera
              </li>
              <li>
                <strong>Tarik Panah</strong> —{' '}
                <span className="txt-x">Merah (Kanan/Kiri)</span>,{' '}
                <span className="txt-y">Hijau (Atas/Bawah)</span>,{' '}
                <span className="txt-z">Biru (Depan/Belakang)</span>
              </li>
              <li>
                <strong>Mode Putar Terkendali</strong> — Cincin penuh 360° per sumbu + tombol cepat <code>±15°/45°/90°</code> & <code>Tegakkan 0°</code>
              </li>
              <li>
                <strong>Tombol Lantai</strong> — Menempelkan objek tepat di atas objek di bawahnya atau lantai (Y=0)
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Monitor size={16} />
              <span>Mouse & Pintasan ala Blender</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Klik Kiri / Kanan + Geser</strong> — Orbit / Pan kamera
              </li>
              <li>
                <strong>Scroll Roda</strong> — Perbesar / perkecil (Zoom)
              </li>
              <li>
                <kbd>G</kbd> / <kbd>R</kbd> / <kbd>S</kbd> — Mode Geser / Putar / Skala
              </li>
              <li>
                <kbd>F</kbd> — Fokus kamera ke objek terpilih
              </li>
              <li>
                <kbd>Shift + D</kbd> — Duplikat objek terpilih
              </li>
              <li>
                <kbd>Delete</kbd> / <kbd>X</kbd> — Hapus objek terpilih
              </li>
              <li>
                <kbd>Ctrl + Z</kbd> / <kbd>Ctrl + Y</kbd> — Undo / Redo
              </li>
            </ul>
          </div>

          <div className="help-box help-box-full">
            <div className="help-box-title">
              <Magnet size={16} />
              <span>3 Fitur Snap Pintar (Menu Snap di Atas)</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Magnet Blok & Sudut (Gabungan Magnetic + Edge + Proximity):</strong> Otomatis menarik permukaan, garis tepi, dan titik sudut blok saat berdekatan supaya menyatu mulus tanpa celah maupun garis sambungan.
              </li>
              <li>
                <strong>Garis Sejajar (Alignment):</strong> Memunculkan garis bantu laser saat posisi tengah atau batas objek sejajar lurus dengan objek lain dari jarak jauh.
              </li>
              <li>
                <strong>Snap Grid Lantai:</strong> Mengunci langkah geser & skala ke ukuran petak meter (<code>0.1m</code>–<code>1.0m</code>) di area terbuka.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
