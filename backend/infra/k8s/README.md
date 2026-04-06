# FoodieGo Backend Kubernetes Baseline

## Files

1. `namespace.yaml`
2. `configmap.yaml`
3. `secret.template.yaml`
4. `deployment.yaml`
5. `service.yaml`
6. `hpa.yaml`
7. `pdb.yaml`
8. `kustomization.yaml`

## Apply (example)

1. `kubectl apply -f backend/infra/k8s/namespace.yaml`
2. update `backend/infra/k8s/secret.template.yaml` and apply as `Secret`.
3. `kubectl apply -k backend/infra/k8s`

## Rollback

1. `kubectl rollout undo deployment/foodiego-backend -n foodiego`
2. run post-rollback validation:
   - `/api/v1/health`
   - `/api/v1/metrics`
   - `npm run deploy:verify`

## Staged Rollout/Rollback Evidence

1. Set staging context and URLs:
   - `K8S_CONTEXT=foodiego-staging`
   - `K8S_NAMESPACE=foodiego`
   - `K8S_DEPLOYMENT=foodiego-backend`
   - `K8S_MANIFEST_PATH=infra/k8s`
   - `K8S_HEALTHCHECK_URL=https://staging-api.foodiego.in/api/v1/health`
2. Execute drill:
   - `npm run k8s:rollout:drill`
3. Evidence artifact is written to:
   - `backend/artifacts/drills/k8s-rollout-drill-*.json`

Local rehearsal note:
- Use `K8S_MANIFEST_PATH=infra/k8s-local` for kind/local cluster rehearsals without touching staging manifests.
