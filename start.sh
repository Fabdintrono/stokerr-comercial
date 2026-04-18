#!/bin/bash
PROJECT_DIR="/home/fabriziodp/.openclaw/workspace/stocker"
PORT=3001
LOG="/tmp/stocker.log"

case "${1:-start}" in
  start)
    # Kill existing if running
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
      echo "Stocker ya esta corriendo en puerto $PORT (PID $PID). Usa 'stocker restart' para reiniciar."
      exit 0
    fi
    echo "Iniciando Stocker en puerto $PORT..."
    cd "$PROJECT_DIR" && npx next start -p $PORT &>"$LOG" &
    sleep 2
    if lsof -ti:$PORT &>/dev/null; then
      echo "Stocker listo: http://localhost:$PORT"
    else
      echo "Error al iniciar. Ver log: $LOG"
      tail -5 "$LOG"
      exit 1
    fi
    ;;
  stop)
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
      kill $PID 2>/dev/null
      echo "Stocker detenido."
    else
      echo "Stocker no esta corriendo."
    fi
    ;;
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
  build)
    echo "Building Stocker..."
    cd "$PROJECT_DIR" && npx next build
    ;;
  dev)
    PID=$(lsof -ti:$PORT 2>/dev/null)
    [ -n "$PID" ] && kill $PID 2>/dev/null
    echo "Stocker dev en puerto $PORT..."
    cd "$PROJECT_DIR" && npx next dev -p $PORT
    ;;
  seed)
    echo "Seeding database..."
    cd "$PROJECT_DIR" && npm run db:seed
    ;;
  log)
    tail -f "$LOG"
    ;;
  status)
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
      echo "Stocker corriendo en puerto $PORT (PID $PID)"
    else
      echo "Stocker no esta corriendo."
    fi
    ;;
  *)
    echo "Uso: stocker [start|stop|restart|build|dev|seed|log|status]"
    ;;
esac
