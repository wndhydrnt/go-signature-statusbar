package main

import (
	"fmt"
)

type test struct {
	attr string
}

func main() {
	fmt.Println(&test{
		attr: "test",
	})
}
