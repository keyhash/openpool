.PHONY: lint lint-test test build-test-net test-net

node_modules:
	npm install

lint: node_modules
	node_modules/.bin/standard

lint-fix: node_modules
	node_modules/.bin/standard --fix

test: node_modules
	npm test

build-monero-test-net:
	docker build --tag="openpool/monero-test-net" docker/monero-test-net

monero-test-net:
	docker run \
		-p 28080:28080 \
		-p 28081:28081 \
		-p 28082:28082 \
		-p 28083:28083 \
		-p 38080:38080 \
		-p 38081:38081 \
		-p 38082:38082 \
		-p 38083:38083 \
		openpool/monero-test-net

build-miner:
	docker build --tag="openpool/xmrig" docker/xmrig

miner:
	docker run \
		--read-only -m 50M \
		--cpu-shares 256 \
		openpool/xmrig \
		--url=172.17.42.1:10001 \
		--user=9wq792k9sxVZiLn66S3Qzv8QfmtcwkdXgM5cWGsXAPxoQeMQ79md51PLPCijvzk1iHbuHi91pws5B7iajTX9KTtJ4bh2tCh \
		--pass=x \
		--keepalive \
		--donate-level=1 \
		--max-cpu-usage 25 \
		--no-huge-pages \
		--threads=1 \
		--print-time=5

build-database:
	docker pull postgres

database:
	docker run \
		-p 5432:5432 \
		postgres

dev: database monero-test-net 
