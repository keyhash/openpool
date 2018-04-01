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
	docker build --tag="openpool/monero-test-net" test/tools/monero-test-net

monero-test-net:
	docker run \
		-p 28080:28080 \
		-p 28081:28081 \
		-p 28082:28082 \
		-p 38080:38080 \
		-p 38081:38081 \
		-p 38082:38082 \
		openpool/monero-test-net

build-miner:
	docker build --tag="openpool/xmrig" test/tools/xmrig

miner:
	docker run \
		--read-only -m 50M \
		--cpu-shares 256 \
		openpool/xmrig \
		--url=172.17.42.1:31415 \
		--user=481G669KZ2fGeeTVyBUdgvTh1WufoPtSUTwsnD5fKCNNTSVkBemWTnedXZMMfmMcZsDdCXcGyeadPijRxNYDKS4JGSCbwzP \
		--pass=x \
		--keepalive \
		--donate-level=1 \
		--max-cpu-usage 25 \
		--no-huge-pages \
		--threads=1 \
		--print-time=5

