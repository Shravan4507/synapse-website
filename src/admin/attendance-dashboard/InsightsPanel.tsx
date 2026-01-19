import { useMemo } from 'react'
import type { Attendance } from '../../lib/qrVerificationService'
import { generateInsightsSummary } from '../../lib/analyticsService'
import './InsightsPanel.css'

interface InsightsPanelProps {
    records: Attendance[]
}

export default function InsightsPanel({ records }: InsightsPanelProps) {
    const insights = useMemo(() => {
        if (records.length === 0) return null
        return generateInsightsSummary(records)
    }, [records])

    if (!insights) {
        return (
            <div className="insights-panel">
                <h2>📊 Smart Insights</h2>
                <p className="no-data">Not enough data to generate insights</p>
            </div>
        )
    }

    return (
        <div className="insights-panel">
            <h2>📊 Smart Insights</h2>

            {/* Overview */}
            <div className="insight-section">
                <h3>📈 Trends</h3>
                <div className="trend-card">
                    <div className="trend-indicator">
                        {insights.overview.trend.trend === 'increasing' && '↗️'}
                        {insights.overview.trend.trend === 'decreasing' && '↘️'}
                        {insights.overview.trend.trend === 'stable' && '➡️'}
                    </div>
                    <div className="trend-info">
                        <div className="trend-label">Attendance is</div>
                        <div className="trend-value">
                            {insights.overview.trend.trend}
                            {insights.overview.trend.change > 0 &&
                                ` by ${insights.overview.trend.change}%`
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Peak Hours */}
            <div className="insight-section">
                <h3>⏰ Peak Activity</h3>
                <div className="peak-info">
                    <div className="peak-item">
                        <span className="peak-label">Peak Hour:</span>
                        <span className="peak-value">
                            {insights.time.peakHour}:00 - {insights.time.peakHour + 1}:00
                        </span>
                    </div>
                    <div className="peak-item">
                        <span className="peak-label">Busiest Day:</span>
                        <span className="peak-value">{insights.time.busiestDay}</span>
                    </div>
                </div>
            </div>

            {/* Top Volunteers */}
            {insights.volunteers.length > 0 && (
                <div className="insight-section">
                    <h3>🏆 Top Volunteers</h3>
                    <div className="volunteers-list">
                        {insights.volunteers.map((volunteer, index) => (
                            <div key={volunteer.id} className="volunteer-item">
                                <div className="volunteer-rank">#{index + 1}</div>
                                <div className="volunteer-info">
                                    <div className="volunteer-name">{volunteer.name}</div>
                                    <div className="volunteer-stats">
                                        {volunteer.scans} scans
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment Insights */}
            <div className="insight-section">
                <h3>💰 Payment Status</h3>
                <div className="payment-breakdown">
                    <div className="payment-stat">
                        <div className="payment-label">Paid</div>
                        <div className="payment-value success">{insights.payment.paid}</div>
                    </div>
                    <div className="payment-stat">
                        <div className="payment-label">Pending</div>
                        <div className="payment-value warning">{insights.payment.pending}</div>
                    </div>
                    <div className="payment-stat">
                        <div className="payment-label">Free</div>
                        <div className="payment-value info">{insights.payment.free}</div>
                    </div>
                </div>
                <div className="payment-percentage">
                    <div className="percentage-bar">
                        <div
                            className="percentage-fill"
                            style={{ width: `${insights.payment.percentPaid}%` }}
                        />
                    </div>
                    <div className="percentage-label">
                        {insights.payment.percentPaid}% payment completion
                    </div>
                </div>
            </div>

            {/* Anomalies */}
            {insights.anomalies.length > 0 && (
                <div className="insight-section">
                    <h3>⚠️ Alerts</h3>
                    <div className="anomalies-list">
                        {insights.anomalies.map((anomaly, index) => (
                            <div
                                key={index}
                                className={`anomaly-item severity-${anomaly.severity}`}
                            >
                                <div className="anomaly-icon">
                                    {anomaly.severity === 'high' && '🔴'}
                                    {anomaly.severity === 'medium' && '🟡'}
                                    {anomaly.severity === 'low' && '🟢'}
                                </div>
                                <div className="anomaly-text">{anomaly.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prediction */}
            <div className="insight-section">
                <h3>🔮 Prediction</h3>
                <div className="prediction-card">
                    <div className="prediction-label">Expected next day attendance:</div>
                    <div className="prediction-value">{insights.prediction} scans</div>
                </div>
            </div>
        </div>
    )
}
