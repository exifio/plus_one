import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandBadge } from "../components/BrandBadge";
import { fetchRecruitmentStatus } from "../services/applicationService";
import type { RecruitmentStatus } from "../types";

export type HeaderBackConfig = {
  label: string;
  onClick?: () => void;
  to?: string;
};

export type SellerLayoutContext = {
  setHeaderBack: (config: HeaderBackConfig | null) => void;
  recruitmentStatus: RecruitmentStatus | null;
  recruitmentError: boolean;
};

export const SellerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isApplyPage = location.pathname.startsWith("/apply");
  const [headerBack, setHeaderBack] = useState<HeaderBackConfig | null>(null);
  const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus | null>(null);
  const [recruitmentError, setRecruitmentError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRecruitmentStatus()
      .then((status) => {
        if (active) {
          setRecruitmentStatus(status);
          setRecruitmentError(false);
        }
      })
      .catch(() => {
        if (active) {
          setRecruitmentError(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleBackClick = () => {
    if (headerBack?.onClick) {
      headerBack.onClick();
    } else if (headerBack?.to) {
      navigate(headerBack.to);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="seller-app">
      <header className="seller-header">
        <div className="seller-header-container">
          {isApplyPage ? (
            <button
              type="button"
              className="header-back-link"
              onClick={handleBackClick}
              aria-label={headerBack?.label ?? "처음으로 이동"}
            >
              {headerBack?.label ?? "← 처음으로"}
            </button>
          ) : (
            <Link to="/" className="brand-logo" aria-label="+1 홈으로 이동">
              <BrandBadge />
              <span className="brand-title">플러스 원</span>
            </Link>
          )}

          {isApplyPage && (
            <Link to="/" className="brand-logo" aria-label="+1 홈으로 이동">
              <BrandBadge />
              <span className="brand-title">플러스 원</span>
            </Link>
          )}
        </div>
      </header>
      <main className="seller-main">
        <div className="seller-content-container">
          <Outlet
            context={{ setHeaderBack, recruitmentStatus, recruitmentError } satisfies SellerLayoutContext}
          />
        </div>
      </main>
    </div>
  );
};
