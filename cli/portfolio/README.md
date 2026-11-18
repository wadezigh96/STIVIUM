# Stivium Portfolio CLI

CLI ini adalah command center read-only untuk snapshot portofolio saham, ETF, dan crypto. Ia menyimpan ledger lokal, menghitung nilai posisi, cost basis, unrealized P/L, alokasi, konsentrasi, dan reminder review. CLI tidak terhubung ke broker, exchange account, wallet signer, atau endpoint transaksi.

## Quick start

```bash
npm run portfolio -- overview
npm run portfolio -- add --symbol BTC --type crypto --quantity 0.1 --cost 60000 --price 65000
npm run portfolio -- add --symbol AAPL --type stock --quantity 5 --cost 180 --price 195
npm run portfolio -- prices
npm run portfolio -- reminder add --title "Review allocation" --due 2026-12-01T09:00:00+07:00 --notes "Check concentration and cash buffer"
npm run portfolio -- overview
```

Ledger default tersimpan di `~/.stivium/portfolio.json` dengan permission lokal yang ketat. Untuk workspace atau test terpisah, gunakan `STIVIUM_PORTFOLIO_FILE=/path/to/portfolio.json`.

## Commands

`overview` menampilkan dashboard terminal, holdings, P/L, allocation bars, risk flags, dan reminder aktif. `add` membuat atau memperbarui posisi berdasarkan `symbol`, `type`, `quantity`, `cost`, dan optional `price`. `remove` menghapus posisi dari ledger lokal. `prices` mengambil harga crypto yang dikenali dari CoinGecko public API; hanya symbol publik yang dikirim, bukan quantity, cost basis, atau data pribadi. Stock/ETF memakai `--price` manual sampai adapter market data yang sesuai ditambahkan.

Subcommand `reminder add`, `reminder list`, `reminder check`, `reminder done`, dan `reminder delete` mengelola reminder lokal. `reminder check` cocok dijalankan dari cron atau Task Scheduler. CLI sendiri tidak mengklaim sebagai daemon dan tidak menjamin delivery jika tidak dijalankan oleh scheduler.

## Scheduling reminder

Linux/macOS, contoh menjalankan pengecekan setiap jam dan menulis output ke log lokal:

```cron
0 * * * * cd /path/to/STIVIUM && STIVIUM_PORTFOLIO_FILE=$HOME/.stivium/portfolio.json npm run portfolio -- reminder check >> $HOME/.stivium/reminders.log 2>&1
```

Windows dapat memakai Task Scheduler dengan action yang sama. Untuk reminder berbasis Manus, gunakan ScheduleTask dengan instruksi untuk menjalankan `npm run portfolio -- reminder check` pada environment yang memiliki file ledger; konfigurasi jadwal adalah langkah terpisah dari CLI ini.

## Data and safety notes

Harga adalah snapshot non-executable dan dapat stale atau gagal. Output akan menandai posisi tanpa harga, bukan menganggap nilainya nol. Angka P/L dan alokasi memakai mata uang yang tersimpan pada holding; versi pertama mengasumsikan `USD` sebagai presentation currency dan tidak melakukan FX conversion otomatis. Jangan memasukkan nomor rekening, private key, seed phrase, API key, atau kredensial ke command line, ledger, atau log.
