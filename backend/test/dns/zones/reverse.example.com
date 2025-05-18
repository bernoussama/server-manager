$TTL 3600
@ IN SOA ns1.1.168.192.in-addr.arpa. admin.example.com. (
        2025051801       ; Serial
        3600  ; Refresh
        1800         ; Retry
        604800       ; Expire
        86400 )      ; Negative Cache TTL
;
@ IN NS ns1.1.168.192.in-addr.arpa.
1 IN PTR example.com.
