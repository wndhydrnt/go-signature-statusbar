package main

import (
	"fmt"
)

type test struct {
	attr string
}

func issue1() {
	fmt.Println(&test{
		attr: "test",
	})
}
