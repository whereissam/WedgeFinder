FROM apify/actor-node:22

# Install production dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev --no-optional --no-audit --no-fund \
 && echo "Installed dependencies:" && (npm ls --omit=dev --all || true)

# Copy the rest of the source
COPY . ./

# Run the Actor entrypoint with native TypeScript type-stripping (Node 22)
CMD ["node", "--experimental-strip-types", "src/actor.ts"]
