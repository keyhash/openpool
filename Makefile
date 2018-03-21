.PHONY: lint lint-test test build-test-net test-net

node_modules:
	npm install

lint: node_modules
	node_modules/.bin/standard

lint-fix: node_modules
	node_modules/.bin/standard --fix

test: node_modules
	npm test

build-test-net:
	docker build --tag="openpool/test-net" test/tools/test-net

test-net:
	docker run \
		-p 28080:28080 \
		-p 28081:28081 \
		-p 28082:28082 \
		-p 38080:38080 \
		-p 38081:38081 \
		-p 38082:38082 \
		openpool/test-net
