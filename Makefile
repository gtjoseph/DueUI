
version := $(shell git describe)

all: release

libs: libs/*
	@git submodule update --init
	@cd libs ; ./install.sh
	
dist: libs | css/* fonts/* js/* dueui.html dueui_config_default.json
	@echo "Building $(version)"
	@mkdir ./dist &>/dev/null || :
	@./build.sh	

releases/DueUI-$(version).zip: dist
	@echo "Release $(version) > releases/DueUI-$(version).zip"
	@cd dist ; zip -qr ../releases/DueUI-$(version).zip .

release: releases/DueUI-$(version).zip

clean:
	@rm -rf dist

.PHONY: libs dist release clean