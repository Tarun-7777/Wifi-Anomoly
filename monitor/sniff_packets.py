from scapy.all import sniff, IP
from datetime import datetime
from queue import Queue

live_data_queue = Queue(maxsize=500)

def packet_callback(packet):
    try:
        if IP in packet:
            src = packet[IP].src
            dst = packet[IP].dst
            proto = packet[IP].proto
            length = len(packet)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            print(f"📦 {timestamp}: {src} → {dst}, Proto: {proto}, Length: {length}")

            live_data_queue.put({
                "Timestamp": timestamp,
                "Source_IP": src,
                "Dest_IP": dst,
                "Protocol": proto,
                "Length": length
            })

            if live_data_queue.qsize() > 500:
                live_data_queue.get()
    except Exception as e:
        print("Error:", e)

def start_sniffing():
    print("📡 Live packet capture started...")
    sniff(prn=packet_callback, store=False)

if __name__ == "__main__":
    start_sniffing()
