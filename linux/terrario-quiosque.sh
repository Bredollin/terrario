#!/bin/sh
# Terrario em tela cheia num monitor sem area de trabalho (ex.: Asgard, Debian).
# Sobe o servidor do Terrario em 127.0.0.1 e abre o Chromium em quiosque pelo
# cage (um compositor Wayland de uma janela so). Rode no console (tty), logado.
#
#   ./terrario-quiosque.sh          abre o terrario na tela
#   ./terrario-quiosque.sh quadro   abre o quadro de curiosidades (TV da sala)
#   ./terrario-quiosque.sh parar    fecha (pode ser por SSH)
#
# Precisa de: nodejs (20+), cage e chromium.
# Variaveis: TERRARIO_SAIDA (markdown; padrao ~/terrario/conhecimento),
# PORT (padrao 4747), TERRARIO_INTERVALO (segundos entre cacadas; padrao 180),
# TERRARIO_TROCA (segundos por curiosidade no quadro; padrao 30),
# TERRARIO_LAT/TERRARIO_LON (clima do quadro; padrao Goiania).
set -eu

AQUI=$(cd "$(dirname "$0")/.." && pwd)
PORTA=${PORT:-4747}
ESTADO=${XDG_STATE_HOME:-$HOME/.local/state}/terrario
SAIDA=${TERRARIO_SAIDA:-$HOME/terrario/conhecimento}
INTERVALO=${TERRARIO_INTERVALO:-180}
TROCA=${TERRARIO_TROCA:-30}
TELA="/?quiosque&intervalo=$INTERVALO"
[ "${1:-}" = quadro ] && TELA="/quadro.html?intervalo=$INTERVALO&troca=$TROCA"

if [ "${1:-}" = parar ]; then
  pkill -u "$(id -u)" -f "cage -- .*127.0.0.1:$PORTA" && echo "Terrario fechado." || echo "Terrario nao estava aberto."
  exit 0
fi

falta=""
for p in node cage chromium; do command -v "$p" >/dev/null 2>&1 || falta="$falta $p"; done
if [ -n "$falta" ]; then
  echo "Falta instalar:$falta"
  echo "No Debian: sudo apt install nodejs cage chromium"
  exit 1
fi
if [ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]; then
  echo "Aviso: ja existe uma tela grafica aberta; o cage vai abrir uma janela nela."
fi

mkdir -p "$ESTADO" "$SAIDA"
TERRARIO_SAIDA="$SAIDA" PORT="$PORTA" node "$AQUI/server.mjs" >"$ESTADO/servidor.log" 2>&1 &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null || true' EXIT INT TERM

# espera o servidor responder (ate 15 s)
i=0
until node -e "fetch('http://127.0.0.1:$PORTA/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 30 ] || ! kill -0 "$SERVIDOR" 2>/dev/null; then
    echo "O servidor nao subiu. Veja $ESTADO/servidor.log"
    exit 1
  fi
  sleep 0.5
done
echo "Terrario no ar. Markdown em $SAIDA. Para fechar: $0 parar"

cage -- chromium --kiosk --noerrdialogs --disable-infobars --no-first-run \
  --disable-session-crashed-bubble --disable-features=Translate \
  --ozone-platform=wayland --user-data-dir="$ESTADO/chromium" \
  "http://127.0.0.1:$PORTA$TELA"
