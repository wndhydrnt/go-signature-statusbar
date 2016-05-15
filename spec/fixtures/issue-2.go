package main

import (
	"encoding/json"
	"strings"
)

type issues2Test struct {
	Field string
}

func issue2() {
	json.NewDecoder(strings.NewReader(`{"Field":"value"}`)).Decode(&issues2Test{})
}
