# Nivara Production Readiness

## Status

Phase 5A integration is implemented but not approved for deployment. The current classifier remains the existing v1 model and has not been retrained or modified.

Held-out evaluation metrics:

- Top-1 Accuracy: 94.21%
- Balanced Accuracy: 96.23%
- Macro F1: 92.69%

These metrics describe the held-out dataset only. Dataset domain shift means they do not guarantee equivalent performance on arbitrary real-world property photographs or resident smartphone images.

## Architecture

```text
Resident multipart upload
  -> Backend multer memory buffer
  -> Cloudinary permanent HTTPS URL
  -> MongoDB Complaint.photoUrl
  -> Admin visual-analysis route
  -> Backend visual analysis service
  -> ML service POST /predict with imageUrl
  -> Prediction and Grad-CAM artifacts
  -> Cloudinary artifact URLs
  -> MongoDB Complaint.visualAnalysis
```

Legacy `overlayBase64` and `heatmapBase64` fields remain readable for backward compatibility. New production records prefer `overlayUrl` and `heatmapUrl` and do not persist large Base64 artifacts.

## Services

- Frontend: React/Vite on port 5173
- Backend: Express/MongoDB on port 5000
- ML service: FastAPI on port 8001
- Image storage: Cloudinary
- Text triage and embeddings: configured Gemini provider
- Email: configured SMTP provider, if enabled

## Environment Variables

Backend variables are documented in `backend/.env.example`: MongoDB, JWT, Gemini/provider selection, visual AI URL/timeout, Cloudinary, SMTP, and client origin. ML variables are documented in `ml-service/.env.example`: `PORT`, `HOST`, `MODEL_PATH`, `DEVICE`, and `CONFIDENCE_THRESHOLD`.

Never commit `.env` files or secrets. `VISUAL_AI_URL` and all provider credentials stay server-side.

## Startup Order

1. Start MongoDB.
2. Start the ML service from `ml-service`.
3. Start the backend from `backend`.
4. Start the frontend from `frontend`.

Health checks:

- `GET http://localhost:8001/health` must return `status=healthy`, `modelStatus=ready`, and `modelLoaded=true`.
- `GET http://localhost:5000/api/health` confirms backend dependencies configured at startup.

## API Dependencies and Controls

`POST /api/admin/complaints/:id/visual-analysis` requires authentication and the admin role. It returns controlled errors for missing complaints, missing photos, ML failures, malformed predictions, and timeouts. It never changes complaint category, priority, status, or status history.

The ML service accepts a complaint image URL, follows no redirects, limits the request timeout, and accepts only supported image content types. The backend only passes the URL already stored on the complaint.

## Storage Flow

Complaint photos and visual artifacts are stored in Cloudinary. MongoDB stores URLs and structured analysis fields. The schema continues to accept legacy Base64 records so existing complaints remain renderable.

## Security Considerations

- Keep JWT, Gemini, Cloudinary, SMTP, and database credentials out of source control.
- Keep ML service URLs and stack traces out of frontend responses.
- Enforce HTTPS for deployed Cloudinary URLs.
- Restrict CORS and Cloudinary transformations for production deployment.
- Review Cloudinary access policies and retention rules.
- Keep visual analysis advisory; feedback never triggers training or automatic complaint mutation.

## Known Limitations

- Visual analysis is admin-triggered and synchronous.
- Artifact uploads require valid Cloudinary configuration.
- The model has five trained slug classes and does not cover water leakage or lift/door damage in the classifier.
- Grad-CAM is explanatory evidence, not a causal guarantee.
- Real-world resident imagery remains subject to domain shift.

## Manual End-to-End Checklist

1. Start MongoDB.
2. Start ML service: `cd ml-service; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001`.
3. Verify `/health`.
4. Start backend: `cd backend; npm start`.
5. Start frontend: `cd frontend; npm run dev`.
6. Log in as a resident.
7. Submit a complaint with a JPG, PNG, or WEBP photo.
8. Log in as an admin and open the complaint.
9. Run Gemini analysis.
10. Run Visual Analysis.
11. Inspect Original, AI Attention, and Heatmap views.
12. Run related-incident search.
13. Submit resident visual feedback.
14. Verify `Complaint.photoUrl`, `Complaint.visualAnalysis`, and `Complaint.visualFeedback` in MongoDB.
15. Verify `overlayUrl` and `heatmapUrl` point to HTTPS Cloudinary resources for new production analyses.

## Deployment Checklist

- [ ] MongoDB production URI configured
- [ ] Strong JWT secret configured
- [ ] Gemini/provider credentials configured
- [ ] Cloudinary credentials configured
- [ ] SMTP credentials configured if email is required
- [ ] ML checkpoint mounted at `models/classification/nivara-visual-classifier.pt`
- [ ] ML health check reports READY
- [ ] Backend can reach ML service over the configured private network
- [ ] CORS/client URL restricted to deployed frontend
- [ ] HTTPS enabled for public services and image URLs
- [ ] Backend, ML, and frontend tests pass
- [ ] Manual visual-analysis and feedback flow verified
- [ ] Deployment approval granted after reviewing domain-shift limitations
