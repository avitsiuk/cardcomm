#!/usr/bin/env bash

ESM_DIR="../lib/mjs"

##########################################################
fix_paths() {
    local SRC=${BASH_SOURCE[0]}
    local TGT=""
    local SCRIPT_DIR=""
    while [ -L "$SRC" ]; do
        TGT=$(readlink "$SRC")
        if [[ $TGT == /* ]]; then
            SRC=$TGT
        else
            SCRIPT_DIR=$( dirname "$SRC" )
            SRC=$SCRIPT_DIR/$TGT
        fi
    done
    SCRIPT_DIR=$( cd -P "$( dirname "$SRC" )" >/dev/null 2>&1 && pwd )
    absolutize () {
        declare -n ARG_PATH=$1
        local ABS_PATH=""
        if [[ ${ARG_PATH:0:1} == "/" ]]
        then
            ABS_PATH=$ARG_PATH
        else
            ABS_PATH="$SCRIPT_DIR/$ARG_PATH"
        fi
        ARG_PATH=$ABS_PATH
    }

    absolutize ESM_DIR
}
fix_paths
##########################################################

echo "Fixing ESM..."

if ! [ -d "$ESM_DIR" ]; then
    echo "ESM directory not found: \"$ESM_DIR\""
    exit 1
fi

for file in $(find "${ESM_DIR}" -name '*.js' ); do
    sed -i "s/from *'\(\.\{1,2\}\/[^']*\)'/from '\\1\.mjs'/g" "$file"
    mv "${file}" "${file%.js}.mjs"
done

echo "Done"
echo ""
