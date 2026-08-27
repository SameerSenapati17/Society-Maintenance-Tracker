import React, { useEffect, useRef } from "react";

export default function OperationsNetworkVisual({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Define Topological Nodes representing Property Operations Pipeline
    const nodeDefinitions = [
      { id: "building_a", label: "Tower A Units", x: 0.12, y: 0.28, type: "source", color: "#818cf8" },
      { id: "building_b", label: "Tower B Units", x: 0.12, y: 0.68, type: "source", color: "#818cf8" },
      { id: "triage", label: "Triage Engine", x: 0.38, y: 0.48, type: "hub", color: "#6366f1" },
      { id: "sla_engine", label: "SLA Monitor", x: 0.52, y: 0.22, type: "monitor", color: "#38bdf8" },
      { id: "dispatch", label: "Work Orders", x: 0.64, y: 0.52, type: "dispatch", color: "#a855f7" },
      { id: "squad_plumb", label: "Plumbing Squad", x: 0.86, y: 0.26, type: "agent", color: "#fbbf24" },
      { id: "squad_elec", label: "HVAC & Electrical", x: 0.86, y: 0.50, type: "agent", color: "#fb7185" },
      { id: "resolution", label: "Verified Close", x: 0.86, y: 0.76, type: "sink", color: "#34d399" }
    ];

    // Pipeline Connections (Edges)
    const edges = [
      { from: "building_a", to: "triage" },
      { from: "building_b", to: "triage" },
      { from: "triage", to: "sla_engine" },
      { from: "triage", to: "dispatch" },
      { from: "sla_engine", to: "dispatch" },
      { from: "dispatch", to: "squad_plumb" },
      { from: "dispatch", to: "squad_elec" },
      { from: "dispatch", to: "resolution" }
    ];

    // Active Data Packets traveling along edges
    const packets = [
      { edgeIndex: 0, progress: 0.1, speed: 0.006, color: "#818cf8" },
      { edgeIndex: 1, progress: 0.6, speed: 0.005, color: "#818cf8" },
      { edgeIndex: 2, progress: 0.3, speed: 0.008, color: "#38bdf8" },
      { edgeIndex: 3, progress: 0.8, speed: 0.007, color: "#6366f1" },
      { edgeIndex: 4, progress: 0.2, speed: 0.006, color: "#a855f7" },
      { edgeIndex: 5, progress: 0.5, speed: 0.006, color: "#fbbf24" },
      { edgeIndex: 6, progress: 0.2, speed: 0.005, color: "#fb7185" },
      { edgeIndex: 7, progress: 0.7, speed: 0.009, color: "#34d399" }
    ];

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    function handleResize() {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    }

    window.addEventListener("resize", handleResize);

    function getNodePos(node) {
      // Calculate subtle parallax offset based on distance from mouse
      const offsetX = (mouseX - width / 2) * 0.025;
      const offsetY = (mouseY - height / 2) * 0.025;
      return {
        x: node.x * width + offsetX,
        y: node.y * height + offsetY
      };
    }

    let time = 0;

    function render() {
      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);
      time += 0.02;

      // Draw Edges with subtle glow
      edges.forEach((edge) => {
        const fromNode = nodeDefinitions.find((n) => n.id === edge.from);
        const toNode = nodeDefinitions.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const p1 = getNodePos(fromNode);
        const p2 = getNodePos(toNode);

        // Edge Path
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.16)";
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw Packets (Animated Signal Pulses)
      if (!prefersReducedMotion) {
        packets.forEach((packet) => {
          packet.progress += packet.speed;
          if (packet.progress > 1) packet.progress = 0;

          const edge = edges[packet.edgeIndex];
          if (!edge) return;
          const fromNode = nodeDefinitions.find((n) => n.id === edge.from);
          const toNode = nodeDefinitions.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return;

          const p1 = getNodePos(fromNode);
          const p2 = getNodePos(toNode);

          const currentX = p1.x + (p2.x - p1.x) * packet.progress;
          const currentY = p1.y + (p2.y - p1.y) * packet.progress;

          // Packet glow
          ctx.beginPath();
          ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
          ctx.fillStyle = packet.color;
          ctx.shadowColor = packet.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Draw Nodes
      nodeDefinitions.forEach((node) => {
        const pos = getNodePos(node);
        const isHovered = Math.hypot(mouseX - pos.x, mouseY - pos.y) < 30;

        // Outer pulse ring for hubs
        if (node.type === "hub" && !prefersReducedMotion) {
          const pulseRadius = 14 + Math.sin(time * 2) * 3;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Base Node Circle
        ctx.beginPath();
        const baseRadius = node.type === "hub" ? 7 : 5;
        ctx.arc(pos.x, pos.y, isHovered ? baseRadius + 2 : baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isHovered ? 12 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner core
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Node Label
        ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = isHovered ? "#ffffff" : "rgba(203, 213, 225, 0.75)";
        ctx.textAlign = "center";
        ctx.fillText(node.label, pos.x, pos.y + 16);
      });

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative h-56 sm:h-72 lg:h-80 w-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
