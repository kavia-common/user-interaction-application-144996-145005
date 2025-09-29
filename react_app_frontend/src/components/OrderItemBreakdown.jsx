import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import "./orderItemBreakdown.css";

/**
 * Mocked data models and stubbed functions for demo purposes.
 * No backend calls are made; these functions simulate async behavior.
 */

// PUBLIC_INTERFACE
export function fetchOrderItemsMock() {
  /** Simulate fetching order items with fees for the UI. */
  return Promise.resolve([
    {
      id: "itm_1",
      title: "Drug License - Address Update",
      metadata: "Fri, Jul 26, 2024 - 12:51 AM",
      originalAmount: 75.0,
      amount: 75.0,
      refundedAmount: 0.0,
      fees: [
        { type: "Processing fee", original: 2.5, refundableDefault: 0.0, maxRefund: 0.0 },
        { type: "Convenience fee", original: 1.0, refundableDefault: 0.0, maxRefund: 0.0 },
        { type: "Tax", original: 5.75, refundableDefault: 5.75, maxRefund: 5.75 }
      ]
    },
    {
      id: "itm_2",
      title: "Drug License - Renewal",
      metadata: "Fri, Jul 26, 2024 - 01:10 PM",
      originalAmount: 120.0,
      amount: 120.0,
      refundedAmount: 0.0,
      fees: [
        { type: "Processing fee", original: 3.25, refundableDefault: 0.0, maxRefund: 0.0 },
        { type: "Convenience fee", original: 1.25, refundableDefault: 0.0, maxRefund: 0.0 },
        { type: "Tax", original: 7.95, refundableDefault: 7.95, maxRefund: 7.95 }
      ]
    },
    {
      id: "itm_3",
      title: "Drug License - New Application",
      metadata: "Sat, Jul 27, 2024 - 09:42 AM",
      originalAmount: 210.0,
      amount: 210.0,
      refundedAmount: 0.0,
      fees: [
        { type: "Processing fee", original: 4.25, refundableDefault: 0.0, maxRefund: 0.0 },
        { type: "Convenience fee", original: 1.75, refundableDefault: 0.0, maxRefund: 0.0 },
        { type: "Tax", original: 12.6, refundableDefault: 12.6, maxRefund: 12.6 }
      ]
    }
  ]);
}

// PUBLIC_INTERFACE
export function issueRefundMock(payload) {
  /** Simulate issuing a refund. Returns success with slight delay. */
  // eslint-disable-next-line no-console
  console.log("Stub issueRefund called with payload:", payload);
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 800));
}

// PUBLIC_INTERFACE
export function currency(n) {
  /** Basic USD currency formatter. */
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
}

/**
 * Small button components
 */
function PrimaryButton({ children, ...rest }) {
  return (
    <button className="btn btn-primary" {...rest}>
      {children}
    </button>
  );
}
function SecondaryButton({ children, ...rest }) {
  return (
    <button className="btn btn-secondary" {...rest}>
      {children}
    </button>
  );
}
function TertiaryButton({ children, ...rest }) {
  return (
    <button className="btn btn-tertiary" {...rest}>
      {children}
    </button>
  );
}

/**
 * Modal with focus trap and Esc handling
 */
function useFocusTrap(open) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;

    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function keyHandler(e) {
      if (e.key === "Escape") {
        // Let parent close via prop
      }
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    el.addEventListener("keydown", keyHandler);
    first && first.focus();

    return () => {
      el.removeEventListener("keydown", keyHandler);
    };
  }, [open]);
  return ref;
}

function ConfirmRefundModal({
  open,
  onClose,
  item,
  onConfirm,
}) {
  const [refundAmount, setRefundAmount] = useState(0);
  const [feeEdits, setFeeEdits] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open || !item) return;
    setRefundAmount(item.amount - item.refundedAmount);
    const defaults = {};
    item.fees.forEach((f) => {
      defaults[f.type] = Math.min(f.refundableDefault || 0, f.maxRefund || f.refundableDefault || 0);
    });
    setFeeEdits(defaults);
    setError("");
  }, [open, item]);

  const maxRefundable = useMemo(() => {
    if (!item) return 0;
    const base = Math.max(item.amount - item.refundedAmount, 0);
    const feeCap = item.fees.reduce((acc, f) => acc + (f.maxRefund || 0), 0);
    return base + feeCap;
  }, [item]);

  const totalRequestedRefund = useMemo(() => {
    const fees = Object.values(feeEdits).reduce((a, b) => a + (Number(b) || 0), 0);
    return (Number(refundAmount) || 0) + fees;
  }, [refundAmount, feeEdits]);

  useEffect(() => {
    if (!open) return;
    if (totalRequestedRefund <= 0) {
      setError("Enter amount greater than $0.00");
      return;
    }
    if (totalRequestedRefund > maxRefundable) {
      setError("Exceeds refundable amount");
      return;
    }
    setError("");
  }, [open, totalRequestedRefund, maxRefundable]);

  const handleFeeChange = (type, value, f) => {
    const v = Number(value);
    const cap = Math.min(f.maxRefund || 0, f.original || 0);
    if (isNaN(v) || v < 0) {
      setFeeEdits((prev) => ({ ...prev, [type]: 0 }));
    } else {
      setFeeEdits((prev) => ({ ...prev, [type]: Math.min(v, cap) }));
    }
  };

  const handleConfirm = async () => {
    if (error || submitting) return;
    setSubmitting(true);
    const payload = {
      items: [
        {
          id: item.id,
          amount: Number(refundAmount) || 0,
          feeRefunds: Object.entries(feeEdits).map(([type, amount]) => ({ type, amount: Number(amount) || 0 })),
        },
      ],
      reason: "User-initiated refund",
      notes: "",
    };
    const res = await issueRefundMock(payload);
    setSubmitting(false);
    if (res?.ok) {
      onConfirm(payload);
    } else {
      setError("Failed to issue refund. Please try again.");
    }
  };

  if (!open || !item) return null;

  const partialNote =
    totalRequestedRefund < maxRefundable && totalRequestedRefund > 0
      ? "Partial refund will withhold some fees."
      : "";

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="refund-modal-title" onClick={onClose}>
      <div className="modal" ref={trapRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="refund-modal-title">Issue Refund</h3>
          <button className="close" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <div className="subtitle">Order • {item.title}</div>
        </div>
        <div className="modal-body">
          <section>
            <div className="section-title">Item Summary</div>
            <div className="summary-grid">
              <div className="label">{item.title}</div>
              <div className="value">{currency(item.amount)}</div>
            </div>
            <div className="helper">Max refundable: {currency(maxRefundable)}</div>
          </section>

          <section>
            <div className="section-title">Refund Amount</div>
            <div className="input-row">
              <span className="prefix">$</span>
              <input
                className={`amount-input ${error && "has-error"}`}
                type="number"
                step="0.01"
                min="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Math.max(0, Number(e.target.value)))}
                aria-label="Refund amount"
              />
            </div>
            <div className={`helper ${totalRequestedRefund > maxRefundable ? "error" : ""}`}>
              {error || `Customer receives: ${currency(totalRequestedRefund)}`}
            </div>
            {partialNote && <div className="helper warn">{partialNote}</div>}
          </section>

          <section>
            <div className="section-title">Editable Fees</div>
            <table className="fee-table">
              <thead>
                <tr>
                  <th align="left">Label</th>
                  <th>Original</th>
                  <th>Editable Refund</th>
                  <th align="left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {item.fees.map((f) => {
                  const cap = Math.min(f.maxRefund || 0, f.original || 0);
                  const v = feeEdits[f.type] ?? 0;
                  const invalid = v > cap;
                  return (
                    <tr key={f.type}>
                      <td className="fee-label">{f.type}</td>
                      <td align="center">{currency(f.original)}</td>
                      <td align="center">
                        <input
                          type="number"
                          className={`fee-input ${invalid ? "has-error" : ""}`}
                          value={v}
                          min="0"
                          max={cap}
                          step="0.01"
                          onChange={(e) => handleFeeChange(f.type, e.target.value, f)}
                          aria-label={`Refund amount for ${f.type}`}
                        />
                      </td>
                      <td className="notes">
                        <span className="helper">
                          Max {currency(cap)} {cap === 0 ? "(non-refundable)" : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <div className="modal-footer">
          <a className="policy-link" href="#policy" onClick={(e) => e.preventDefault()}>
            View refund policy
          </a>
          <div className="actions">
            <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={handleConfirm}
              disabled={!!error || submitting || totalRequestedRefund <= 0}
              aria-disabled={!!error || submitting || totalRequestedRefund <= 0}
            >
              {submitting ? "Processing..." : "Confirm Refund"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ item, selected, onSelect, onEditFee, onOpenRefund }) {
  const [hover, setHover] = useState(false);
  const refundedSoFar = item.refundedAmount || 0;
  const currentAmount = item.amount || 0;
  const difference = Math.max((item.originalAmount || currentAmount) - refundedSoFar - currentAmount, 0);
  // "Refunded" column shows total refunded so far.
  // Difference column can be interpreted as remaining refundable beyond current amount if edited, but we keep it simple.

  return (
    <div
      className={`list-row ${selected ? "selected" : ""}`}
      role="listitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input
        type="checkbox"
        className="row-check"
        checked={selected}
        onChange={(e) => onSelect(item.id, e.target.checked)}
        aria-label={`Select ${item.title}`}
      />
      <div className="row-icon" aria-hidden>
        📄
      </div>
      <div className="row-info">
        <div className="row-title">{item.title}</div>
        <div className="row-sub" role="link" tabIndex={0}>
          {item.metadata}
        </div>
      </div>
      <div className="row-money">
        <div className="money-group">
          <div className="col">
            <div className="label-sm">Original</div>
            <div className="row-amt neutral">{currency(item.originalAmount)}</div>
          </div>
          <div className="col">
            <div className="label-sm">Amount</div>
            <div className={`row-amt negative`}>{`-${currency(currentAmount)}`}</div>
          </div>
          <div className="col">
            <div className="label-sm">Refunded</div>
            <div className="row-amt positive">{currency(refundedSoFar)}</div>
          </div>
        </div>
        <div className="row-actions" aria-hidden={!hover}>
          <TertiaryButton onClick={() => onEditFee(item)}>Edit Fees</TertiaryButton>
          <TertiaryButton onClick={() => onOpenRefund(item)}>Refund</TertiaryButton>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export default function OrderItemBreakdown() {
  /** Enhanced Order Item Breakdown page with editable fees, refunded column, and refund confirmation modal. */
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [bulkBarVisible, setBulkBarVisible] = useState(false);

  useEffect(() => {
    fetchOrderItemsMock().then((data) => setItems(data));
  }, []);

  useEffect(() => {
    setBulkBarVisible(Object.values(selectedIds).some(Boolean));
  }, [selectedIds]);

  const onSelect = (id, checked) => {
    setSelectedIds((prev) => ({ ...prev, [id]: checked }));
  };

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.amount, 0), [items]);
  const totalRefunded = useMemo(() => items.reduce((acc, it) => acc + (it.refundedAmount || 0), 0), [items]);
  const totalOriginal = useMemo(() => items.reduce((acc, it) => acc + (it.originalAmount || it.amount || 0), 0), [items]);

  const openRefundModal = (item) => {
    setModalItem(item);
    setModalOpen(true);
  };

  const closeRefundModal = () => {
    setModalOpen(false);
    setModalItem(null);
  };

  const applyRefund = useCallback(
    (payload) => {
      // Update local state to reflect refund; this is purely client-side for demo.
      const upd = [...items];
      payload.items.forEach((p) => {
        const idx = upd.findIndex((it) => it.id === p.id);
        if (idx >= 0) {
          const feeSum = (p.feeRefunds || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
          const totalRefund = (Number(p.amount) || 0) + feeSum;
          upd[idx] = {
            ...upd[idx],
            refundedAmount: (upd[idx].refundedAmount || 0) + totalRefund,
            amount: Math.max((upd[idx].amount || 0) - totalRefund, 0),
          };
        }
      });
      setItems(upd);
      setToastMsg(`Refund of ${currency(payload.items.reduce((a, b) => a + Number(b.amount || 0), 0))} issued`);
      setTimeout(() => setToastMsg(""), 3000);
      closeRefundModal();
    },
    [items]
  );

  const onEditFeeInline = (item) => {
    // For this demo, reuse the refund modal for editing fees as well.
    openRefundModal(item);
  };

  const clearSelection = () => setSelectedIds({});

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const bulkRefund = () => {
    // Simple bulk demo: open modal for the first selected item; in real usage, you'd show aggregate modal.
    const firstId = Object.entries(selectedIds).find(([_, v]) => v)?.[0];
    const first = items.find((it) => it.id === firstId);
    if (first) openRefundModal(first);
  };

  return (
    <div className="page-grid">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">City of Ohey</div>
        </div>
        <nav className="nav">
          <div className="nav-group">
            <div className="nav-item active">
              <span className="icon">🏠</span>
              <span>Dashboard</span>
            </div>
            <div className="nav-item">
              <span className="icon">💳</span>
              <span>Payments</span>
            </div>
          </div>
          <div className="nav-group">
            <div className="nav-item">
              <span className="icon">🧾</span>
              <span>Licenses & Permits</span>
            </div>
            <div className="nav-item">
              <span className="icon">📊</span>
              <span>Reports</span>
            </div>
            <div className="nav-item">
              <span className="icon">🛟</span>
              <span>Support</span>
            </div>
          </div>
        </nav>
      </aside>

      <main className="main">
        <div className="tabs">
          <div className="tab active">Recent</div>
          <div className="tab">Reports</div>
          <div className="tab">Support</div>
        </div>

        <div className={`selection-bar ${bulkBarVisible ? "active" : ""}`} role="region" aria-live="polite">
          <div className="sel-count">{selectedCount} selected</div>
          <div className="spacer" />
          <SecondaryButton onClick={bulkRefund}>Refund</SecondaryButton>
          <SecondaryButton onClick={() => { /* could open bulk edit */ }}>Edit Fees</SecondaryButton>
          <TertiaryButton onClick={clearSelection}>Clear</TertiaryButton>
        </div>

        <section className="list-card" role="list" aria-label="Itemized Charges">
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              selected={!!selectedIds[item.id]}
              onSelect={onSelect}
              onEditFee={onEditFeeInline}
              onOpenRefund={openRefundModal}
            />
          ))}
        </section>

        <section className="fee-breakdown">
          <div className="section-title">Fee Breakdown</div>
          <div className="fee-row">
            <div>Subtotal</div>
            <div className="amount neutral">{currency(subtotal)}</div>
          </div>
          <div className="fee-row">
            <div>Refunded</div>
            <div className="amount positive">-{currency(totalRefunded)}</div>
          </div>
          <div className="fee-row total">
            <div>Total</div>
            <div className="amount success">{currency(totalOriginal - totalRefunded)}</div>
          </div>
        </section>
      </main>

      <aside className="summary">
        <h3>Order Summary</h3>
        <div className="summary-row">
          <div>Amount</div>
          <div className="amount success">{currency(totalOriginal)}</div>
        </div>
        <div className="summary-row">
          <div>Refunded</div>
          <div className="amount positive">-{currency(totalRefunded)}</div>
        </div>
        <div className="summary-total">
          <div className="summary-row">
            <div>Total</div>
            <div className="amount success">{currency(totalOriginal - totalRefunded)}</div>
          </div>
        </div>
      </aside>

      {modalOpen && (
        <ConfirmRefundModal
          open={modalOpen}
          onClose={closeRefundModal}
          item={modalItem}
          onConfirm={applyRefund}
        />
      )}

      {toastMsg && (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg} <a href="#refund-details" onClick={(e) => e.preventDefault()}>View refund details</a>
        </div>
      )}
    </div>
  );
}
