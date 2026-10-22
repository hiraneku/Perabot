import React from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Layers,
  Grid3x3,
  Palette,
} from 'lucide-react';

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
          <h3>Panduan Lengkap Perabot 3D Studio</h3>
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
              <span>75 Basic Shapes & Layar Penuh</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>75 Basic Shapes:</strong> Ketuk bentuk untuk menambahkannya ke kanvas, atau <strong>tekan agak lama (~0.4 detik)</strong> untuk membuka kartu penjelasan bentuk.
              </li>
              <li>
                <strong>Sembunyikan Sidebar:</strong> Gunakan tombol <code>&lt;</code> pada sidebar kiri (Utility) atau <code>&gt;</code> pada sidebar kanan untuk meluaskan layar kerja, ditambah tombol <strong>Fullscreen</strong> di pojok kanan atas.
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Palette size={16} />
              <span>Roda Warna RGB & Subdivision</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Roda Warna RGB (<kbd>C</kbd>):</strong> Putar roda warna HSV/RGB, atur opasitas kaca transparan, cahaya lampu (<em>Emissive</em>), <em>Roughness</em>, <em>Metalness</em>, serta mode <strong>Cat Klik Objek</strong> & <strong>Pipet</strong>.
              </li>
              <li>
                <strong>Subdivision Lanjutan:</strong> Di tab <strong>Subdiv</strong>, pilih Level <code>0–3</code>, algoritma <em>Smooth (Loop)</em> atau <em>Simple (Planar)</em>, ketajaman rusuk (<em>Edge Crease</em>), kunci alas rata, & jaring <em>wireframe</em>.
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Layers size={16} />
              <span>Fitur Surface Alignment (Bar Atas)</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>Menu Surface (<kbd>T</kbd>):</strong> Fitur mandiri sejajar dengan <em>Snap</em>! Saat aktif, seret objek terpilih atau panah geser XZ untuk menempel presisi di atas atap miring, dinding, kubah, tangga, atau bukit.
              </li>
              <li>
                <strong>Sisi Tempel & Klik Tujuan:</strong> Pilih sisi tempel (<em>Alas -Y</em>, <em>Belakang -Z</em> untuk kusen jendela/pintu di dinding, atau <em>Atas +Y</em>) serta opsi <strong>Klik Target Permukaan</strong>.
              </li>
            </ul>
          </div>

          <div className="help-box">
            <div className="help-box-title">
              <Grid3x3 size={16} />
              <span>Snap Pintar & World/Terrain Grid</span>
            </div>
            <ul className="help-list">
              <li>
                <strong>3 Mode Snap:</strong> <em>Magnet Blok & Sudut</em>, <em>Garis Sejajar</em>, dan <em>Snap Grid</em>.
              </li>
              <li>
                <strong>4 Gaya Grid:</strong> <em>World Grid</em>, <em>Tile Grid</em>, <em>Blueprint</em>, dan <em>Terrain 3D</em> (Bukit/Lembah/Terasering) lengkap dengan elevasi lantai bertingkat.
              </li>
            </ul>
          </div>

          <div className="help-box help-box-full">
            <div className="help-box-title">
              <Monitor size={16} />
              <span>Pintasan Keyboard Cepat</span>
            </div>
            <ul className="help-list">
              <li>
                <kbd>G</kbd> Geser • <kbd>R</kbd> Putar • <kbd>S</kbd> Skala • <kbd>T</kbd> Toggle Surface Alignment • <kbd>C</kbd> Buka Roda Warna RGB • <kbd>F</kbd> Fokus Kamera • <kbd>Shift+D</kbd> Salin • <kbd>Del</kbd> Hapus • <kbd>Ctrl+Z/Y</kbd> Undo/Redo
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
