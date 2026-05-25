#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from matplotlib import rcParams

rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
rcParams['axes.unicode_minus'] = False


def filter_last_24_hours(df):
    if 'timestamp' not in df.columns:
        return df
    
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    last_24h = datetime.now() - timedelta(hours=24)
    return df[df['timestamp'] >= last_24h].copy()


def resample_data(df, interval='5min'):
    if 'timestamp' not in df.columns:
        return df
    
    df = df.set_index('timestamp')
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df_resampled = df[numeric_cols].resample(interval).mean()
    df_resampled = df_resampled.dropna()
    return df_resampled.reset_index()


def generate_trend_charts(csv_file, output_dir='charts'):
    print(f"\n{'='*60}")
    print("📊 数据可视化 - 生成趋势图表")
    print(f"{'='*60}\n")
    
    if not os.path.exists(csv_file):
        print(f"❌ 错误: 文件 {csv_file} 不存在")
        return False
    
    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        print(f"❌ 读取CSV文件失败: {e}")
        return False
    
    if len(df) == 0:
        print("❌ 错误: CSV文件为空")
        return False
    
    print(f"📋 数据总记录数: {len(df)} 条")
    
    df_24h = filter_last_24_hours(df)
    if len(df_24h) == 0:
        print("⚠️  警告: 过去24小时没有数据，使用全部数据")
        df_24h = df.copy()
        df_24h['timestamp'] = pd.to_datetime(df_24h['timestamp'])
    else:
        print(f"📅 过去24小时数据量: {len(df_24h)} 条")
    
    df_plot = resample_data(df_24h, interval='5min')
    print(f"📈 重采样后数据点: {len(df_plot)} 个\n")
    
    os.makedirs(output_dir, exist_ok=True)
    
    chart_files = []
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('系统资源使用趋势 (过去24小时)', fontsize=16, fontweight='bold', y=0.995)
    
    if 'cpu_total_percent' in df_plot.columns:
        ax = axes[0, 0]
        ax.plot(df_plot['timestamp'], df_plot['cpu_total_percent'], 
                color='#ef4444', linewidth=2, label='总CPU使用率')
        ax.fill_between(df_plot['timestamp'], df_plot['cpu_total_percent'], 
                        alpha=0.2, color='#ef4444')
        
        cpu_core_cols = [col for col in df_plot.columns if col.startswith('cpu_core_') and col.endswith('_percent')]
        for i, col in enumerate(cpu_core_cols[:8]):
            ax.plot(df_plot['timestamp'], df_plot[col], alpha=0.4, linewidth=1, 
                    label=f'Core {i}')
        
        ax.set_xlabel('时间')
        ax.set_ylabel('CPU使用率 (%)')
        ax.set_title('CPU使用趋势')
        ax.legend(loc='upper left', fontsize=8)
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
    
    if 'memory_percent' in df_plot.columns:
        ax = axes[0, 1]
        ax.plot(df_plot['timestamp'], df_plot['memory_percent'], 
                color='#3b82f6', linewidth=2, label='内存使用率')
        ax.fill_between(df_plot['timestamp'], df_plot['memory_percent'], 
                        alpha=0.2, color='#3b82f6')
        
        if 'swap_percent' in df_plot.columns and df_plot['swap_percent'].max() > 0:
            ax.plot(df_plot['timestamp'], df_plot['swap_percent'], 
                    color='#f59e0b', linewidth=2, linestyle='--', label='交换分区使用率')
        
        ax.set_xlabel('时间')
        ax.set_ylabel('内存使用率 (%)')
        ax.set_title('内存使用趋势')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
    
    if 'disk_usage_percent' in df_plot.columns:
        ax = axes[1, 0]
        disk_cols = [col for col in df_plot.columns if col.startswith('disk_') and col.endswith('_percent')]
        
        for col in disk_cols:
            mount_point = col.replace('disk_', '').replace('_percent', '').replace('_', '/')
            if mount_point == '':
                mount_point = '/'
            ax.plot(df_plot['timestamp'], df_plot[col], linewidth=2, label=mount_point)
        
        ax.set_xlabel('时间')
        ax.set_ylabel('磁盘使用率 (%)')
        ax.set_title('磁盘使用趋势')
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
    
    if 'network_upload_speed' in df_plot.columns and 'network_download_speed' in df_plot.columns:
        ax = axes[1, 1]
        
        upload_mb = df_plot['network_upload_speed'] / (1024 * 1024)
        download_mb = df_plot['network_download_speed'] / (1024 * 1024)
        
        ax.plot(df_plot['timestamp'], download_mb, 
                color='#22c55e', linewidth=2, label='下载速度')
        ax.fill_between(df_plot['timestamp'], download_mb, 
                        alpha=0.2, color='#22c55e')
        
        ax.plot(df_plot['timestamp'], upload_mb, 
                color='#a855f7', linewidth=2, label='上传速度')
        ax.fill_between(df_plot['timestamp'], upload_mb, 
                        alpha=0.2, color='#a855f7')
        
        ax.set_xlabel('时间')
        ax.set_ylabel('网络速度 (MB/s)')
        ax.set_title('网络流量趋势')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    overview_file = os.path.join(output_dir, 'overview_trends.png')
    plt.savefig(overview_file, dpi=150, bbox_inches='tight')
    plt.close()
    chart_files.append(overview_file)
    print(f"✅ 已生成: {overview_file}")
    
    if 'cpu_total_percent' in df_plot.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.plot(df_plot['timestamp'], df_plot['cpu_total_percent'], 
                color='#ef4444', linewidth=2.5)
        ax.fill_between(df_plot['timestamp'], df_plot['cpu_total_percent'], 
                        alpha=0.3, color='#ef4444')
        
        avg_cpu = df_plot['cpu_total_percent'].mean()
        max_cpu = df_plot['cpu_total_percent'].max()
        ax.axhline(y=avg_cpu, color='#666', linestyle='--', alpha=0.7, 
                   label=f'平均值: {avg_cpu:.1f}%')
        ax.axhline(y=80, color='#f59e0b', linestyle=':', alpha=0.7, label='警告阈值: 80%')
        
        ax.set_xlabel('时间', fontsize=12)
        ax.set_ylabel('CPU使用率 (%)', fontsize=12)
        ax.set_title('CPU使用率趋势 (过去24小时)', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
        
        stats_text = f'平均值: {avg_cpu:.1f}%  |  最大值: {max_cpu:.1f}%'
        ax.text(0.02, 0.95, stats_text, transform=ax.transAxes, 
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
                fontsize=10, verticalalignment='top')
        
        plt.tight_layout()
        cpu_file = os.path.join(output_dir, 'cpu_trend.png')
        plt.savefig(cpu_file, dpi=150, bbox_inches='tight')
        plt.close()
        chart_files.append(cpu_file)
        print(f"✅ 已生成: {cpu_file}")
    
    if 'memory_percent' in df_plot.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.plot(df_plot['timestamp'], df_plot['memory_percent'], 
                color='#3b82f6', linewidth=2.5)
        ax.fill_between(df_plot['timestamp'], df_plot['memory_percent'], 
                        alpha=0.3, color='#3b82f6')
        
        avg_mem = df_plot['memory_percent'].mean()
        max_mem = df_plot['memory_percent'].max()
        ax.axhline(y=avg_mem, color='#666', linestyle='--', alpha=0.7, 
                   label=f'平均值: {avg_mem:.1f}%')
        ax.axhline(y=90, color='#ef4444', linestyle=':', alpha=0.7, label='警告阈值: 90%')
        
        ax.set_xlabel('时间', fontsize=12)
        ax.set_ylabel('内存使用率 (%)', fontsize=12)
        ax.set_title('内存使用率趋势 (过去24小时)', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)
        
        stats_text = f'平均值: {avg_mem:.1f}%  |  最大值: {max_mem:.1f}%'
        ax.text(0.02, 0.95, stats_text, transform=ax.transAxes, 
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
                fontsize=10, verticalalignment='top')
        
        plt.tight_layout()
        mem_file = os.path.join(output_dir, 'memory_trend.png')
        plt.savefig(mem_file, dpi=150, bbox_inches='tight')
        plt.close()
        chart_files.append(mem_file)
        print(f"✅ 已生成: {mem_file}")
    
    if 'network_upload_speed' in df_plot.columns and 'network_download_speed' in df_plot.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        download_mb = df_plot['network_download_speed'] / (1024 * 1024)
        upload_mb = df_plot['network_upload_speed'] / (1024 * 1024)
        
        ax.plot(df_plot['timestamp'], download_mb, 
                color='#22c55e', linewidth=2, label='下载速度')
        ax.fill_between(df_plot['timestamp'], download_mb, 
                        alpha=0.3, color='#22c55e')
        
        ax.plot(df_plot['timestamp'], upload_mb, 
                color='#a855f7', linewidth=2, label='上传速度')
        ax.fill_between(df_plot['timestamp'], upload_mb, 
                        alpha=0.3, color='#a855f7')
        
        avg_download = download_mb.mean()
        max_download = download_mb.max()
        avg_upload = upload_mb.mean()
        max_upload = upload_mb.max()
        
        ax.set_xlabel('时间', fontsize=12)
        ax.set_ylabel('网络速度 (MB/s)', fontsize=12)
        ax.set_title('网络流量趋势 (过去24小时)', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        stats_text = (f'下载 - 平均: {avg_download:.2f} MB/s, 最大: {max_download:.2f} MB/s\n'
                      f'上传 - 平均: {avg_upload:.2f} MB/s, 最大: {max_upload:.2f} MB/s')
        ax.text(0.02, 0.95, stats_text, transform=ax.transAxes, 
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
                fontsize=10, verticalalignment='top')
        
        plt.tight_layout()
        net_file = os.path.join(output_dir, 'network_trend.png')
        plt.savefig(net_file, dpi=150, bbox_inches='tight')
        plt.close()
        chart_files.append(net_file)
        print(f"✅ 已生成: {net_file}")
    
    if 'memory_used' in df_plot.columns and 'memory_available' in df_plot.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        used_gb = df_plot['memory_used'] / (1024**3)
        available_gb = df_plot['memory_available'] / (1024**3)
        
        ax.stackplot(df_plot['timestamp'], used_gb, available_gb,
                     labels=['已使用', '可用'],
                     colors=['#ef4444', '#22c55e'],
                     alpha=0.7)
        
        ax.set_xlabel('时间', fontsize=12)
        ax.set_ylabel('内存容量 (GB)', fontsize=12)
        ax.set_title('内存使用分布 (过去24小时)', fontsize=14, fontweight='bold')
        ax.legend(loc='upper left')
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        mem_dist_file = os.path.join(output_dir, 'memory_distribution.png')
        plt.savefig(mem_dist_file, dpi=150, bbox_inches='tight')
        plt.close()
        chart_files.append(mem_dist_file)
        print(f"✅ 已生成: {mem_dist_file}")
    
    print(f"\n{'='*60}")
    print(f"🎉 图表生成完成! 共生成 {len(chart_files)} 个图表文件")
    print(f"📁 输出目录: {os.path.abspath(output_dir)}")
    print(f"{'='*60}\n")
    
    return chart_files


def generate_summary_statistics(csv_file):
    if not os.path.exists(csv_file):
        return None
    
    try:
        df = pd.read_csv(csv_file)
    except Exception:
        return None
    
    df_24h = filter_last_24_hours(df)
    if len(df_24h) == 0:
        df_24h = df.copy()
    
    stats = {
        'period': {
            'start': df_24h['timestamp'].min(),
            'end': df_24h['timestamp'].max(),
            'records': len(df_24h)
        }
    }
    
    if 'cpu_total_percent' in df_24h.columns:
        stats['cpu'] = {
            'avg': df_24h['cpu_total_percent'].mean(),
            'max': df_24h['cpu_total_percent'].max(),
            'min': df_24h['cpu_total_percent'].min()
        }
    
    if 'memory_percent' in df_24h.columns:
        stats['memory'] = {
            'avg': df_24h['memory_percent'].mean(),
            'max': df_24h['memory_percent'].max(),
            'min': df_24h['memory_percent'].min()
        }
    
    if 'network_upload_speed' in df_24h.columns and 'network_download_speed' in df_24h.columns:
        stats['network'] = {
            'avg_upload': df_24h['network_upload_speed'].mean(),
            'max_upload': df_24h['network_upload_speed'].max(),
            'avg_download': df_24h['network_download_speed'].mean(),
            'max_download': df_24h['network_download_speed'].max(),
            'total_sent': df_24h['network_bytes_sent'].iloc[-1] - df_24h['network_bytes_sent'].iloc[0] if 'network_bytes_sent' in df_24h.columns else 0,
            'total_recv': df_24h['network_bytes_recv'].iloc[-1] - df_24h['network_bytes_recv'].iloc[0] if 'network_bytes_recv' in df_24h.columns else 0
        }
    
    disk_cols = [col for col in df_24h.columns if col.startswith('disk_') and col.endswith('_percent')]
    if disk_cols:
        stats['disks'] = {}
        for col in disk_cols:
            mount_point = col.replace('disk_', '').replace('_percent', '').replace('_', '/')
            if mount_point == '':
                mount_point = '/'
            stats['disks'][mount_point] = {
                'avg': df_24h[col].mean(),
                'max': df_24h[col].max(),
                'current': df_24h[col].iloc[-1]
            }
    
    return stats


if __name__ == '__main__':
    import sys
    csv_file = sys.argv[1] if len(sys.argv) > 1 else 'system_monitor_log.csv'
    generate_trend_charts(csv_file)
