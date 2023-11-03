#!/usr/bin/env bash
echo "[Deletion]"
java -jar /home/affidaty/gp.jar --delete 4299999900
echo "[Installation]"
java -jar /home/affidaty/gp.jar --install /mnt/c/Users/Affidaty/eclipse-workspace/credit-card-synkrony/deliverables/com/affidaty/card/javacard/card.cap
