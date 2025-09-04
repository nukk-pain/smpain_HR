#!/bin/bash

# Usage: ./get-date.sh [format]
# Formats: kr (한국어), iso (YYYY-MM-DD), dot (YYYY.MM.DD), time (with time)

FORMAT=${1:-kr}

case "$FORMAT" in
    kr)
        date +"%Y년 %m월 %d일"
        ;;
    iso)
        date +"%Y-%m-%d"
        ;;
    dot)
        date +"%Y.%m.%d"
        ;;
    time)
        date +"%Y년 %m월 %d일 %H:%M"
        ;;
    *)
        echo "Usage: $0 [kr|iso|dot|time]"
        echo "Default: kr (2025년 08월 21일)"
        exit 1
        ;;
esac