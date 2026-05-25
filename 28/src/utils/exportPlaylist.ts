import type { PlaylistSongRecord } from '../services/db';

const createDownloadLink = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function exportToJSON(songs: PlaylistSongRecord[], playlistName: string): void {
  const data = {
    name: playlistName,
    exportedAt: new Date().toISOString(),
    songs,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const filename = `${playlistName}.json`;

  createDownloadLink(blob, filename);
}

export function exportToCSV(songs: PlaylistSongRecord[], playlistName: string): void {
  const headers = ['ID', '歌曲ID', '歌曲名称', '艺术家', '专辑', '专辑封面', '时长(毫秒)'];
  const rows = songs.map((song) => [
    song.id ?? '',
    song.songId,
    song.songName,
    song.artistName,
    song.albumName,
    song.albumPic,
    song.duration,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${playlistName}.csv`;

  createDownloadLink(blob, filename);
}
