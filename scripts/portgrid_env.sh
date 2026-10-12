#!/bin/bash

portgrid_env_error() {
    printf 'Error: %s\n' "$*" >&2
}

validate_portgrid_env_value() {
    local name="$1"
    local value="$2"

    case "$value" in
        *$'\n'*|*$'\r'*)
            portgrid_env_error "$name cannot contain newlines for .env.local/systemd EnvironmentFile"
            return 1
            ;;
        *"'"*)
            portgrid_env_error "$name cannot contain single quotes for .env.local/systemd EnvironmentFile"
            return 1
            ;;
    esac

    if [ "$name" = "PORTGRID_AUTH_USERNAME" ]; then
        case "$value" in
            *:*)
                portgrid_env_error "$name cannot contain ':' for HTTP Basic auth"
                return 1
                ;;
        esac
    fi
}

# Read one hidden line into the variable named by $1, exactly as typed.
# IFS= keeps leading and trailing whitespace and -r keeps backslashes.
# Returns read's status, so EOF still stops an installer running set -e.
read_portgrid_secret() {
    local __portgrid_secret_var="$1"
    local __portgrid_secret_prompt="$2"
    local __portgrid_secret_value=""
    local __portgrid_secret_status=0

    IFS= read -r -s -p "$__portgrid_secret_prompt" __portgrid_secret_value || __portgrid_secret_status=$?
    printf -v "$__portgrid_secret_var" '%s' "$__portgrid_secret_value"
    return "$__portgrid_secret_status"
}

append_portgrid_env_line() {
    local name="$1"
    local value="$2"

    validate_portgrid_env_value "$name" "$value" || return 1
    printf "%s='%s'\n" "$name" "$value"
}

build_portgrid_env_payload() {
    local librenms_url="$1"
    local librenms_token="$2"
    local auth_username="$3"
    local auth_password="$4"
    local api_token="$5"

    append_portgrid_env_line "DATA_SOURCE" "librenms" || return 1
    append_portgrid_env_line "LIBRENMS_URL" "$librenms_url" || return 1
    append_portgrid_env_line "LIBRENMS_API_TOKEN" "$librenms_token" || return 1
    append_portgrid_env_line "PORTGRID_AUTH_USERNAME" "$auth_username" || return 1
    append_portgrid_env_line "PORTGRID_AUTH_PASSWORD" "$auth_password" || return 1
    append_portgrid_env_line "PORTGRID_API_TOKEN" "$api_token" || return 1
}

write_proxmox_env_local() {
    local ctid="$1"
    local target_path="$2"
    local env_payload="$3"

    printf '%s' "$env_payload" | pct exec "$ctid" -- bash -c 'umask 077; cat > "$1"; chmod 600 "$1"' sh "$target_path"
}
