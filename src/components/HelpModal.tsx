import React from 'react';
import { X, Smartphone, Monitor } from 'lucide-react';

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
          <h3>Panduan Kontrol Perabot 3D</h3>
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
                <strong>Ketuk Objek</strong> — Pilih & tampilkan panah RGB
              </li>
              <li>
                <strong>Tarik Panah</strong> —{' '}
                <span className="txt-x">Merah (Kanan/Kiri)</span>,{' '}
                <span className="txt-y">Hijau (Atas/Bawah)</span>,{' '}
                <span className="txt-z">Biru (Depan/Belakang)</span>
              </li>
              <li>
                <strong>Bola X/Y/Z Pojok</strong> — Ketuk untuk tampak presisi
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
                <strong>Klik Kiri + Geser</strong> — Putar kamera 3D
              </li>
              <li>
                <strong>Klik Kanan + Geser</strong> — Geser (Pan) kamera
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
        </div>
      </div>
    </div>
  );
};
