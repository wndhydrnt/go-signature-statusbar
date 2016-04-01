package main

import (
	"fmt"
	"log"
)

func main() {
	a := "test"
	fmt.Println(fmt.Sprintf("%s", a))

	fmt.Print(
		"line break",
	)

	log.Print(a)
}
