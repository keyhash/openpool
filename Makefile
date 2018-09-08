.PHONY: lint lint-test test build-test-net test-net

node_modules:
	npm install --no-optional

lint: node_modules
	node_modules/.bin/standard

lint-fix: node_modules
	node_modules/.bin/standard --fix

test: node_modules
	npm test

build-miner:
	docker build --tag="openpool/xmrig" docker/xmrig

miner:
	docker run \
		--read-only -m 50M \
		--cpu-shares 256 \
		openpool/xmrig \
		--url=openpool:10001 \
		--user=9wq792k9sxVZiLn66S3Qzv8QfmtcwkdXgM5cWGsXAPxoQeMQ79md51PLPCijvzk1iHbuHi91pws5B7iajTX9KTtJ4bh2tCh \
		--pass=x \
		--keepalive \
		--donate-level=1 \
		--max-cpu-usage 25 \
		--no-huge-pages \
		--threads=1 \
		--print-time=5


