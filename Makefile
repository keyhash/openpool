.PHONY: lint test

node_modules:
	npm install

lint: node_modules
	node_modules/.bin/standard

lint-fix: node_modules
	node_modules/.bin/standard --fix

test:
	echo 0
