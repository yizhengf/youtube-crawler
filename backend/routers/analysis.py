from fastapi import APIRouter

from schemas import AnalysisStatusResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/status", response_model=AnalysisStatusResponse)
def analysis_status():
    return AnalysisStatusResponse(
        status="planned",
        message="AI 分析功能已預留入口，將支援爆款拆解與對標頻道分析。",
    )
