"""
Nivara Visual Intelligence — Image Preprocessing & Validation Pipeline
"""
import io
import base64
from typing import Tuple, Union
from PIL import Image
import torch
import torchvision.transforms as T

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}

# Standard ImageNet normalization constants
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Inference transforms
inference_transform = T.Compose([
    T.Resize((224, 224), interpolation=T.InterpolationMode.BILINEAR),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
])

# Display/Overlay transform
display_transform = T.Compose([
    T.Resize((224, 224), interpolation=T.InterpolationMode.BILINEAR)
])


def validate_and_load_image(
    image_input: Union[bytes, io.BytesIO, Image.Image]
) -> Image.Image:
    """
    Validates file size, decoding, and MIME format, returning a sanitized RGB PIL Image.
    """
    if isinstance(image_input, bytes):
        if len(image_input) > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(f"Image exceeds maximum allowable size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB.")
        stream = io.BytesIO(image_input)
    elif isinstance(image_input, io.BytesIO):
        stream = image_input
    elif isinstance(image_input, Image.Image):
        return image_input.convert("RGB")
    else:
        raise ValueError("Unsupported image input type.")

    try:
        pil_image = Image.open(stream)
        pil_image.verify()  # Verify image integrity
    except Exception as e:
        raise ValueError(f"Corrupt or invalid image file: {str(e)}")

    # Re-open after verify (verify closes the stream)
    stream.seek(0)
    pil_image = Image.open(stream)

    if pil_image.format and pil_image.format.upper() not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported image format: {pil_image.format}. Supported: {', '.join(SUPPORTED_FORMATS)}")

    return pil_image.convert("RGB")


def preprocess_for_inference(
    pil_image: Image.Image,
    device: str = "cpu"
) -> Tuple[torch.Tensor, Image.Image]:
    """
    Transforms PIL image into normalized tensor [1, 3, 224, 224] for CNN forward pass,
    and returns a resized RGB PIL image for Grad-CAM overlay rendering.
    """
    resized_pil = display_transform(pil_image)
    tensor = inference_transform(pil_image).unsqueeze(0).to(device)
    return tensor, resized_pil


def pil_to_base64_png(pil_image: Image.Image) -> str:
    """
    Encodes a PIL Image as a base64 Data URI string.
    """
    buffered = io.BytesIO()
    pil_image.save(buffered, format="PNG", optimize=True)
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
