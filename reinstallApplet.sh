#!/usr/bin/env bash
echo "[Deletion]"
java -jar /home/affidaty/gp.jar --delete 1122334455
echo "[Installation]"
java -jar /home/affidaty/gp.jar --install /mnt/c/Users/Affidaty/eclipse-workspace/credit-card-synkrony/deliverables/com/affidaty/card/javacard/card.cap
