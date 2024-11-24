#!/bin/bash
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --ft-bin)
            FT_BIN="$2"
            shift # past argument
            shift # past value
            ;;
        --config)
            CONFIG_FILE="$2"
            shift
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate inputs
if [[ -z "$FT_BIN" ]]; then
    echo "Error: --ft-bin parameter is required."
    exit 1
fi

if [[ ! -x "$FT_BIN" ]]; then
    echo "Error: Binary file '$FT_BIN' is not executable."
    exit 1
fi

if [[ -z "$CONFIG_FILE" ]]; then
    echo "Error: --config parameter is required."
    exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: Configuration file '$CONFIG_FILE' does not exist."
    exit 1
fi

# Read parameters from the configuration file
CONFIG_PARAMS=$(cat "$CONFIG_FILE")

# Construct and run the command
CMD="$FT_BIN $CONFIG_PARAMS"
echo "Running: $CMD"
$CMD
